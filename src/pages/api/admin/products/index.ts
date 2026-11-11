import type { APIRoute } from 'astro';
import { and, asc, eq, isNull, like, or } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { slugify } from '../../../../lib/slug.ts';

export const GET: APIRoute = async ({ url }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });

  const status = url.searchParams.get('status') as 'disponible' | 'vendido' | 'oculto' | null;
  const categorySlug = url.searchParams.get('category');
  const artisanSlug = url.searchParams.get('artisan');
  const q = url.searchParams.get('q')?.trim();

  const conditions = [];
  if (url.searchParams.get('includeDeleted') !== 'true') {
    conditions.push(isNull(schema.products.deletedAt));
  }
  if (status) conditions.push(eq(schema.products.status, status));
  if (categorySlug) conditions.push(eq(schema.categories.slug, categorySlug));
  if (artisanSlug) conditions.push(eq(schema.artisans.slug, artisanSlug));
  if (q) {
    conditions.push(
      or(
        like(schema.products.name, `%${q}%`),
        like(schema.products.shortDescription, `%${q}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      shortDescription: schema.products.shortDescription,
      priceCents: schema.products.priceCents,
      currency: schema.products.currency,
      status: schema.products.status,
      active: schema.products.active,
      deletedAt: schema.products.deletedAt,
      sortOrder: schema.products.sortOrder,
      artisan: { id: schema.artisans.id, slug: schema.artisans.slug, name: schema.artisans.name },
      category: { id: schema.categories.id, slug: schema.categories.slug, name: schema.categories.name },
      createdAt: schema.products.createdAt,
      updatedAt: schema.products.updatedAt,
    })
    .from(schema.products)
    .innerJoin(schema.artisans, eq(schema.products.artisanId, schema.artisans.id))
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.id));

  return jsonResponse(rows);
};

export const POST: APIRoute = async ({ request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const artisanId = typeof body.artisanId === 'number' ? body.artisanId : null;
  const categoryId = typeof body.categoryId === 'number' ? body.categoryId : null;

  if (!name || !artisanId || !categoryId) {
    return jsonResponse({ error: 'missing_fields' }, { status: 400 });
  }

  const [artisan] = await db.select({ id: schema.artisans.id })
    .from(schema.artisans)
    .where(and(eq(schema.artisans.id, artisanId), eq(schema.artisans.active, true), isNull(schema.artisans.deletedAt)))
    .limit(1);
  const [category] = await db.select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.active, true), isNull(schema.categories.deletedAt)))
    .limit(1);
  if (!artisan || !category) {
    return jsonResponse({ error: 'inactive_reference' }, { status: 400 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let i = 2;
  while (
    await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug))
      .limit(1)
      .then((r) => r.length > 0)
  ) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const [row] = await db
    .insert(schema.products)
    .values({
      slug,
      name,
      artisanId,
      categoryId,
      shortDescription:
        typeof body.shortDescription === 'string' ? body.shortDescription : '',
      longDescription:
        typeof body.longDescription === 'string' ? body.longDescription : '',
      priceCents:
        typeof body.priceCents === 'number' ? body.priceCents : null,
      currency: typeof body.currency === 'string' ? body.currency : 'EUR',
      status:
        body.status === 'vendido' || body.status === 'oculto'
          ? body.status
          : 'disponible',
      active: typeof body.active === 'boolean' ? body.active : true,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    })
    .returning();

  return jsonResponse(row, { status: 201 });
};
