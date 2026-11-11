import type { APIRoute } from 'astro';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../../lib/db/client.ts';
import { jsonResponse } from '../../../../lib/server-utils.ts';

export const GET: APIRoute = async ({ url }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });

  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const conditions = [];
  if (url.searchParams.get('includeDeleted') !== 'true') {
    conditions.push(isNull(schema.inquiries.deletedAt));
  }
  if (status === 'new' || status === 'read' || status === 'archived') {
    conditions.push(eq(schema.inquiries.status, status));
  }
  if (type === 'contact' || type === 'product') {
    conditions.push(eq(schema.inquiries.type, type));
  }

  const rows = await db
    .select({
      id: schema.inquiries.id,
      name: schema.inquiries.name,
      email: schema.inquiries.email,
      phone: schema.inquiries.phone,
      message: schema.inquiries.message,
      type: schema.inquiries.type,
      status: schema.inquiries.status,
      createdAt: schema.inquiries.createdAt,
      deletedAt: schema.inquiries.deletedAt,
    })
    .from(schema.inquiries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.inquiries.createdAt));

  return jsonResponse(rows);
};
