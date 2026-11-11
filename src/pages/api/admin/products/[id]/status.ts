import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../../lib/server-utils.ts';

export const PATCH: APIRoute = async ({ params, request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  if (
    body.status !== 'disponible' &&
    body.status !== 'vendido' &&
    body.status !== 'oculto'
  ) {
    return jsonResponse({ error: 'invalid_status' }, { status: 400 });
  }

  const [row] = await db
    .update(schema.products)
    .set({ status: body.status, updatedAt: new Date() })
    .where(and(eq(schema.products.id, id), isNull(schema.products.deletedAt)))
    .returning({ id: schema.products.id, status: schema.products.status });

  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse(row);
};
