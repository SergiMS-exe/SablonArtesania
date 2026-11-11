import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { slugify } from '../../../../lib/slug.ts';

export const GET: APIRoute = async () => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const rows = await db
    .select()
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.id));
  return jsonResponse(rows);
};

export const POST: APIRoute = async ({ request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return jsonResponse({ error: 'name_required' }, { status: 400 });

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let i = 2;
  while (
    await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug))
      .limit(1)
      .then((r) => r.length > 0)
  ) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  const active = typeof body.active === 'boolean' ? body.active : true;

  const [row] = await db
    .insert(schema.categories)
    .values({ slug, name, active, sortOrder })
    .returning();

  return jsonResponse(row, { status: 201 });
};
