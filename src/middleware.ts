import { defineMiddleware } from 'astro:middleware';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { resolve } from 'node:path';
import { db, schema } from './lib/db/client.ts';
import { getSessionUser } from './lib/server-utils.ts';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);
let databaseReady: Promise<void> | undefined;

async function ensureDatabaseReady() {
  databaseReady ??= migrate(db, {
    migrationsFolder: resolve(process.cwd(), 'drizzle'),
  }).then(() => undefined);

  try {
    await databaseReady;
  } catch (error) {
    databaseReady = undefined;
    throw error;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Development can run `astro dev` directly, without the production entrypoint.
  // Migrate once before any SSR page or API handler touches the database.
  await ensureDatabaseReady();

  const url = new URL(context.request.url);
  const path = url.pathname;

  // Proteger páginas /admin/*
  if (path.startsWith('/admin/') || path === '/admin') {
    if (PUBLIC_ADMIN_PATHS.has(path)) {
      return next();
    }
    const user = getSessionUser(context.cookies);
    if (!user) {
      const nextParam = encodeURIComponent(path + url.search);
      return context.redirect(`/admin/login?next=${nextParam}`);
    }
    context.locals.user = user;
    return next();
  }

  // Proteger /api/admin/*
  if (path.startsWith('/api/admin/')) {
    const user = getSessionUser(context.cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    context.locals.user = user;
    return next();
  }

  const response = await next();
  const contentType = response.headers.get('content-type') ?? '';
  const userAgent = context.request.headers.get('user-agent') ?? '';
  const isCrawler = /bot|crawler|spider|slurp|preview/i.test(userAgent);

  if (
    context.request.method === 'GET' &&
    response.status < 400 &&
    contentType.includes('text/html') &&
    !path.startsWith('/api/') &&
    !path.startsWith('/media/') &&
    !/\.[a-z0-9]+$/i.test(path) &&
    !isCrawler
  ) {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const pagePath = path.length > 255 ? path.slice(0, 255) : path;
      await db.insert(schema.pageViews)
        .values({ day, path: pagePath, views: 1 })
        .onConflictDoUpdate({
          target: [schema.pageViews.day, schema.pageViews.path],
          set: {
            views: sql`${schema.pageViews.views} + 1`,
            deletedAt: null,
          },
        });
    } catch (error) {
      console.error('[analytics] Could not record page view:', error);
    }
  }

  return response;
});
