import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { slugify } from '../../../../lib/slug.ts';

async function loadFull(id: string) {
  if (!db) return null;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, n))
    .limit(1);
  return rows[0] ?? null;
}

export const GET: APIRoute = async ({ params }) => {
  const product = await loadFull(params.id ?? '');
  if (!product) return jsonResponse({ error: 'not_found' }, { status: 404 });
  const images = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.productId, product.id));
  return jsonResponse({ ...product, images });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const current = await loadFull(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const updates: Partial<typeof schema.products.$inferInsert> = {};
  for (const field of [
    'shortDescription',
    'longDescription',
    'currency',
  ] as const) {
    const v = body[field];
    if (typeof v === 'string') updates[field] = v;
  }
  if (typeof body.name === 'string' && body.name.trim()) {
    const newName = body.name.trim();
    updates.name = newName;
    if (newName !== current.name) {
      const baseSlug = slugify(newName);
      let slug = baseSlug;
      let i = 2;
      while (
        await db
          .select({ id: schema.products.id })
          .from(schema.products)
          .where(eq(schema.products.slug, slug))
          .limit(1)
          .then((r) => r.length > 0 && r[0].id !== current.id)
      ) {
        slug = `${baseSlug}-${i}`;
        i += 1;
      }
      updates.slug = slug;
    }
  }
  if (typeof body.artisanId === 'number') updates.artisanId = body.artisanId;
  if (typeof body.categoryId === 'number') updates.categoryId = body.categoryId;
  if (typeof body.priceCents === 'number' || body.priceCents === null) {
    updates.priceCents = (body.priceCents as number | null) ?? null;
  }
  if (body.status === 'disponible' || body.status === 'vendido' || body.status === 'oculto') {
    updates.status = body.status;
  }
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (body.deletedAt === null) {
    updates.deletedAt = null;
    if (typeof body.active !== 'boolean') updates.active = true;
  }
  if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder;
  updates.updatedAt = new Date();

  if (Object.keys(updates).length === 0) return jsonResponse(current);

  const [row] = await db
    .update(schema.products)
    .set(updates)
    .where(eq(schema.products.id, current.id))
    .returning();

  return jsonResponse(row);
};

export const DELETE: APIRoute = async ({ params }) => {
  const current = await loadFull(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });

  await db.update(schema.products)
    .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
    .where(eq(schema.products.id, current.id));
  return jsonResponse({ ok: true });
};
