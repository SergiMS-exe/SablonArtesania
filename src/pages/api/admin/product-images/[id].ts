import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';

export const DELETE: APIRoute = async ({ params }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });

  const rows = await db
    .select()
    .from(schema.productImages)
    .where(eq(schema.productImages.id, id))
    .limit(1);
  if (!rows[0]) return jsonResponse({ error: 'not_found' }, { status: 404 });

  await db.update(schema.productImages)
    .set({ deletedAt: new Date() })
    .where(eq(schema.productImages.id, id));
  return jsonResponse({ ok: true });
};

export const PATCH: APIRoute = async ({ params }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });
  const [row] = await db.update(schema.productImages)
    .set({ deletedAt: null })
    .where(eq(schema.productImages.id, id))
    .returning();
  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse(row);
};
