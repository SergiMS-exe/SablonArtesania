import type { APIRoute } from 'astro';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../../lib/server-utils.ts';

export const PATCH: APIRoute = async ({ params, request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const id = parseInt(params.id ?? '', 10);
  if (!Number.isFinite(id)) return jsonResponse({ error: 'bad_id' }, { status: 400 });

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }
  if (
    body.status !== 'new' &&
    body.status !== 'read' &&
    body.status !== 'archived'
  ) {
    return jsonResponse({ error: 'invalid_status' }, { status: 400 });
  }

  const [row] = await db
    .update(schema.inquiries)
    .set({ status: body.status })
    .where(and(eq(schema.inquiries.id, id), isNull(schema.inquiries.deletedAt)))
    .returning({ id: schema.inquiries.id, status: schema.inquiries.status });

  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse(row);
};
