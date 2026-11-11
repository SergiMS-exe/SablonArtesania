import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { slugify } from '../../../../lib/slug.ts';

async function loadId(id: string) {
  if (!db) return null;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return null;
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.id, n))
    .limit(1);
  return rows[0] ?? null;
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const current = await loadId(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const updates: Partial<typeof schema.categories.$inferInsert> = {};
  if (typeof body.name === 'string' && body.name.trim()) {
    const newName = body.name.trim();
    updates.name = newName;
    if (newName !== current.name) {
      updates.slug = slugify(newName);
    }
  }
  if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder;
  if (typeof body.active === 'boolean') updates.active = body.active;
  if (body.deletedAt === null) {
    updates.deletedAt = null;
    if (typeof body.active !== 'boolean') updates.active = true;
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse(current);
  }

  const [row] = await db
    .update(schema.categories)
    .set(updates)
    .where(eq(schema.categories.id, current.id))
    .returning();

  return jsonResponse(row);
};

export const DELETE: APIRoute = async ({ params }) => {
  const current = await loadId(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });
  await db
    .update(schema.categories)
    .set({ deletedAt: new Date(), active: false })
    .where(eq(schema.categories.id, current.id));
  return jsonResponse({ ok: true, deletedAt: new Date().toISOString() });
};
