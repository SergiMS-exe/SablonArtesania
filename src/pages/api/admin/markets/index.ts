import type { APIRoute } from 'astro';
import { asc } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { parseMarketInput } from '../../../../lib/market-validation.ts';

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(schema.markets)
    .orderBy(asc(schema.markets.startDate), asc(schema.markets.sortOrder));
  return jsonResponse(rows);
};

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const parsed = parseMarketInput(body);
  if ('error' in parsed) return jsonResponse({ error: parsed.error }, { status: 400 });

  try {
    const [row] = await db.insert(schema.markets).values(parsed.value).returning();
    return jsonResponse(row, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonResponse({ error: 'market_already_exists' }, { status: 409 });
    }
    throw error;
  }
};

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed');
}
