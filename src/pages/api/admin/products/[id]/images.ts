import type { APIRoute } from 'astro';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../../lib/server-utils.ts';
import { saveUpload, UploadValidationError } from '../../../../../lib/storage.ts';

export const POST: APIRoute = async ({ params, request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });

  const product = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
    .limit(1);
  if (!product[0]) return jsonResponse({ error: 'not_found' }, { status: 404 });

  const form = await request.formData();
  const files = form.getAll('images').filter((f): f is File => f instanceof File);
  if (files.length === 0) return jsonResponse({ error: 'no_files' }, { status: 400 });

  const existing = await db
    .select({ sortOrder: schema.productImages.sortOrder })
    .from(schema.productImages)
    .where(and(eq(schema.productImages.productId, id), isNull(schema.productImages.deletedAt)))
    .orderBy(asc(schema.productImages.sortOrder));

  let nextOrder =
    existing.length > 0 ? (existing[existing.length - 1].sortOrder ?? 0) + 1 : 0;

  const created: { url: string; sortOrder: number }[] = [];
  for (const file of files) {
    try {
      const saved = await saveUpload(file, 'products');
      const [row] = await db
        .insert(schema.productImages)
        .values({ productId: id, url: saved.url, sortOrder: nextOrder })
        .returning();
      created.push({ url: row.url, sortOrder: row.sortOrder });
      nextOrder += 1;
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return jsonResponse({ error: 'upload_failed', message: err.message }, { status: err.status });
      }
      throw err;
    }
  }

  return jsonResponse({ images: created }, { status: 201 });
};
