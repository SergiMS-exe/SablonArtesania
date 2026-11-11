import type { APIRoute } from 'astro';
import { db, schema } from '../../../lib/db/client.ts';
import { jsonResponse } from '../../../lib/server-utils.ts';
import { sendTelegram, formatContactInquiry } from '../../../lib/telegram.ts';

interface InquiryBody {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  type?: 'contact' | 'product';
}

export const POST: APIRoute = async ({ request }) => {
  if (!db) return jsonResponse({ error: 'db_unavailable' }, { status: 503 });

  let body: InquiryBody;
  try {
    body = (await request.json()) as InquiryBody;
  } catch {
    return jsonResponse({ error: 'bad_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const message = body.message?.trim();
  if (!name || !email || !message) {
    return jsonResponse({ error: 'missing_fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'invalid_email' }, { status: 400 });
  }

  const type: 'contact' | 'product' = body.type === 'product' ? 'product' : 'contact';

  const [row] = await db
    .insert(schema.inquiries)
    .values({
      name,
      email,
      phone: body.phone?.trim() || null,
      message,
      type,
    })
    .returning({ id: schema.inquiries.id });

  // Notificación Telegram (no bloquea la respuesta)
  sendTelegram({
    text: formatContactInquiry({
      name,
      email,
      phone: body.phone,
      message,
      type,
    }),
  }).catch(() => {});

  return jsonResponse({ ok: true, id: row.id, type }, { status: 201 });
};
