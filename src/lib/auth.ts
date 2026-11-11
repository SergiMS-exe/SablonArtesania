import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'sablon_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 días

interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  exp: number; // epoch seconds
}

function getSecret(): string {
  const secret = process.env.SESSION_PASSWORD;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_PASSWORD is required and must be at least 32 characters.',
    );
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function encodeSession(payload: Omit<SessionPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const body: SessionPayload = { ...payload, exp };
  const json = JSON.stringify(body);
  const data = Buffer.from(json).toString('base64url');
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(data))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

export function buildSessionCookieAttributes(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `${COOKIE_NAME}=<token>`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}
