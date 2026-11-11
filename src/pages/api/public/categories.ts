import type { APIRoute } from 'astro';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../lib/db/client.ts';
import { jsonResponse } from '../../../lib/server-utils.ts';

export const GET: APIRoute = async () => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const rows = await db
    .select()
    .from(schema.categories)
    .where(and(eq(schema.categories.active, true), isNull(schema.categories.deletedAt)))
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id));
  return jsonResponse(rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name })));
};
