import type { APIRoute } from 'astro';
import { and, asc, eq, isNull, ne } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';

export const GET: APIRoute = async ({ params }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const slug = params.slug;
  if (!slug) return jsonResponse({ error: 'not_found' }, { status: 404 });

  const rows = await db
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      shortDescription: schema.products.shortDescription,
      longDescription: schema.products.longDescription,
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
    .where(and(
      eq(schema.products.slug, slug),
      eq(schema.products.active, true),
      isNull(schema.products.deletedAt),
      ne(schema.products.status, 'oculto'),
      eq(schema.categories.active, true),
      isNull(schema.categories.deletedAt),
      eq(schema.artisans.active, true),
      isNull(schema.artisans.deletedAt),
    ))
    .limit(1);

  const product = rows[0];
  if (!product) return jsonResponse({ error: 'not_found' }, { status: 404 });

  const images = await db
    .select()
    .from(schema.productImages)
    .where(and(eq(schema.productImages.productId, product.id), isNull(schema.productImages.deletedAt)))
    .orderBy(asc(schema.productImages.sortOrder), asc(schema.productImages.id));

  return jsonResponse({
    ...product,
    images: images.map((i) => ({ url: i.url, altText: i.altText })),
  });
};
