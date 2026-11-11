import type { APIRoute } from 'astro';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../lib/db/client.ts';
import { jsonResponse } from '../../../lib/server-utils.ts';

export const GET: APIRoute = async () => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });
  const rows = await db
    .select()
    .from(schema.artisans)
    .where(and(eq(schema.artisans.active, true), isNull(schema.artisans.deletedAt)))
    .orderBy(asc(schema.artisans.sortOrder), asc(schema.artisans.id));
  return jsonResponse(
    rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      specialty: a.specialty,
      location: a.location,
      shortBio: a.shortBio,
      longBio: a.longBio,
      imageUrl: a.imageUrl,
      instagram: a.instagram,
    })),
  );
};
