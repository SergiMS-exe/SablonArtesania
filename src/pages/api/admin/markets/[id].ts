import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';
import { parseMarketInput } from '../../../../lib/market-validation.ts';

async function findMarket(id: string) {
  const numericId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(numericId) || numericId < 1) return null;
  const [market] = await db
    .select()
    .from(schema.markets)
    .where(eq(schema.markets.id, numericId))
    .limit(1);
  return market ?? null;
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const current = await findMarket(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const parsed = parseMarketInput(body, current);
  if ('error' in parsed) return jsonResponse({ error: parsed.error }, { status: 400 });

  try {
    const [row] = await db
      .update(schema.markets)
      .set({ ...parsed.value, updatedAt: new Date() })
      .where(eq(schema.markets.id, current.id))
      .returning();
    return jsonResponse(row);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return jsonResponse({ error: 'market_already_exists' }, { status: 409 });
    }
    throw error;
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const current = await findMarket(params.id ?? '');
  if (!current) return jsonResponse({ error: 'not_found' }, { status: 404 });
  await db.delete(schema.markets).where(eq(schema.markets.id, current.id));
  return jsonResponse({ ok: true });
};
