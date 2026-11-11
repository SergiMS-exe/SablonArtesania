import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME } from '../../../lib/auth.ts';

export const POST: APIRoute = async ({ cookies, request }) => {
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
  return Response.redirect(new URL('/admin/login', request.url), 303);
};
