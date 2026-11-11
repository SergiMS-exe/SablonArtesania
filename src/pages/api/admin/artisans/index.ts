import type { APIRoute } from 'astro';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { slugify } from '../../../../lib/slug.ts';

export const GET: APIRoute = async () => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const rows = await db
    .select()
    .from(schema.artisans)
    .orderBy(asc(schema.artisans.sortOrder), asc(schema.artisans.id));
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
      .select({ id: schema.artisans.id })
      .from(schema.artisans)
      .where(eq(schema.artisans.slug, slug))
      .limit(1)
      .then((r) => r.length > 0)
  ) {
    slug = `${baseSlug}-${i}`;
    i += 1;
  }

  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

  const [row] = await db
    .insert(schema.artisans)
    .values({
      slug,
      name,
      specialty: (body.specialty as string) ?? null,
      location: (body.location as string) ?? null,
      shortBio: (body.shortBio as string) ?? null,
      longBio: (body.longBio as string) ?? null,
      imageUrl: (body.imageUrl as string) ?? null,
      instagram: (body.instagram as string) ?? null,
      active: typeof body.active === 'boolean' ? body.active : true,
      sortOrder,
    })
    .returning();

  return jsonResponse(row, { status: 201 });
};
