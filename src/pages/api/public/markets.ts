import type { APIRoute } from 'astro';
import { and, asc, eq, gte } from 'drizzle-orm';
import { db, schema } from '../../../lib/db/client.ts';
import { jsonResponse } from '../../../lib/server-utils.ts';

export const GET: APIRoute = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: schema.markets.id,
      location: schema.markets.location,
      startDate: schema.markets.startDate,
      endDate: schema.markets.endDate,
      schedule: schema.markets.schedule,
      instagramUrl: schema.markets.instagramUrl,
    })
    .from(schema.markets)
    .where(and(eq(schema.markets.active, true), gte(schema.markets.endDate, today)))
    .orderBy(asc(schema.markets.startDate), asc(schema.markets.sortOrder));

  return jsonResponse(rows);
};
