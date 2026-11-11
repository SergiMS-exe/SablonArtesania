import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../lib/db/client.ts';
import {
  encodeSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '../../../lib/auth.ts';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!db) {
    return new Response(JSON.stringify({ error: 'db_unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  let email: string | undefined;
  let password: string | undefined;
  const ct = request.headers.get('content-type') ?? '';
  try {
    if (ct.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      email = typeof body.email === 'string' ? body.email : undefined;
      password = typeof body.password === 'string' ? body.password : undefined;
    } else {
      const form = await request.formData();
      email = (form.get('email') as string | null)?.trim().toLowerCase();
      password = (form.get('password') as string | null) ?? undefined;
    }
  } catch {
    return new Response(JSON.stringify({ error: 'bad_request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'missing_credentials' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const rows = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, email.toLowerCase()), isNull(schema.users.deletedAt)))
    .limit(1);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return new Response(JSON.stringify({ error: 'invalid_credentials' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  const token = encodeSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
  });

  if (ct.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return Response.redirect(new URL('/admin', request.url), 303);
};
