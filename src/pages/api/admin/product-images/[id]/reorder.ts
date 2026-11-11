import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../../lib/server-utils.ts';

export const PATCH: APIRoute = async ({ params, request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });

  let body: { sortOrder?: number };
  try {
    body = (await request.json()) as { sortOrder?: number };
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }
  if (typeof body.sortOrder !== 'number') {
    return jsonResponse({ error: 'sortOrder_required' }, { status: 400 });
  }

  const [row] = await db
    .update(schema.productImages)
    .set({ sortOrder: body.sortOrder })
    .where(and(eq(schema.productImages.id, id), isNull(schema.productImages.deletedAt)))
    .returning();

  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse(row);
};
