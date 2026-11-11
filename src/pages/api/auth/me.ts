import type { APIRoute } from 'astro';
import { decodeSession, SESSION_COOKIE_NAME } from '../../../lib/auth.ts';

export const GET: APIRoute = ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSession(token);
  if (!session) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response(
    JSON.stringify({
      authenticated: true,
      user: { id: session.userId, email: session.email, role: session.role },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
};
