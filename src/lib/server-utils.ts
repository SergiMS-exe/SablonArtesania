import type { APIContext } from 'astro';
import { decodeSession, SESSION_COOKIE_NAME } from './auth.ts';

export interface CurrentUser {
  id: number;
  email: string;
  role: string;
}

export function getSessionUser(cookies: APIContext['cookies']): CurrentUser | null {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  const s = decodeSession(token);
  if (!s) return null;
  return { id: s.userId, email: s.email, role: s.role };
}

export function requireSessionUser(
  context: APIContext,
  redirectTo = '/admin/login',
): CurrentUser {
  const user = getSessionUser(context.cookies);
  if (!user) {
    const url = new URL(context.request.url);
    const next = encodeURIComponent(url.pathname + url.search);
    throw context.redirect(`${redirectTo}?next=${next}`);
  }
  return user;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}
