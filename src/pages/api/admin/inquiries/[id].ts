import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number.parseInt(params.id ?? '', 10);
  if (!Number.isSafeInteger(id) || id < 1) return jsonResponse({ error: 'bad_id' }, { status: 400 });
  const [row] = await db.update(schema.inquiries)
    .set({ deletedAt: new Date() })
    .where(eq(schema.inquiries.id, id))
    .returning({ id: schema.inquiries.id });
  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse({ ok: true });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = Number.parseInt(params.id ?? '', 10);
  if (!Number.isSafeInteger(id) || id < 1) return jsonResponse({ error: 'bad_id' }, { status: 400 });
  let body: { restore?: boolean };
  try {
    body = (await request.json()) as { restore?: boolean };
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }
  if (body.restore !== true) return jsonResponse({ error: 'restore_required' }, { status: 400 });
  const [row] = await db.update(schema.inquiries)
    .set({ deletedAt: null })
    .where(eq(schema.inquiries.id, id))
    .returning({ id: schema.inquiries.id });
  if (!row) return jsonResponse({ error: 'not_found' }, { status: 404 });
  return jsonResponse({ ok: true });
};
