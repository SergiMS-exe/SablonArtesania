import type { APIRoute } from 'astro';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';

export const GET: APIRoute = async ({ url }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });

  const status = url.searchParams.get('status') ?? 'disponible';
  const categorySlug = url.searchParams.get('category');
  const artisanSlug = url.searchParams.get('artisan');

  const conditions = [
    eq(schema.products.status, status as 'disponible' | 'vendido' | 'oculto'),
    eq(schema.products.active, true),
    isNull(schema.products.deletedAt),
    eq(schema.categories.active, true),
    isNull(schema.categories.deletedAt),
    eq(schema.artisans.active, true),
    isNull(schema.artisans.deletedAt),
  ];
  if (categorySlug) {
    conditions.push(eq(schema.categories.slug, categorySlug));
  }
  if (artisanSlug) {
    conditions.push(eq(schema.artisans.slug, artisanSlug));
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
      artisan: {
        id: schema.artisans.id,
        slug: schema.artisans.slug,
        name: schema.artisans.name,
      },
      category: {
        id: schema.categories.id,
        slug: schema.categories.slug,
        name: schema.categories.name,
      },
    })
    .from(schema.products)
    .innerJoin(schema.artisans, eq(schema.products.artisanId, schema.artisans.id))
    .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(...conditions))
    .orderBy(asc(schema.products.sortOrder), asc(schema.products.id));

  const images = await db
    .select()
    .from(schema.productImages)
    .where(isNull(schema.productImages.deletedAt))
    .orderBy(asc(schema.productImages.productId), asc(schema.productImages.sortOrder));

  const imagesByProduct = new Map<number, typeof images>();
  for (const img of images) {
    if (!imagesByProduct.has(img.productId)) imagesByProduct.set(img.productId, []);
    imagesByProduct.get(img.productId)!.push(img);
  }

  return jsonResponse(
    rows.map((r) => ({
      ...r,
      images: (imagesByProduct.get(r.id) ?? []).map((i) => i.url),
    })),
  );
};
