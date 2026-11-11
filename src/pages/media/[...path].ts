import type { APIRoute } from 'astro';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { getMediaDir } from '../../lib/storage.ts';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

export const GET: APIRoute = ({ params, request }) => {
  const segments = (params.path ?? '').split('/').filter(Boolean);
  if (!segments.length) return new Response('Not found', { status: 404 });

  const mediaDir = getMediaDir();
  const requested = normalize(join(mediaDir, ...segments));
  if (!requested.startsWith(mediaDir + sep) && requested !== mediaDir) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const st = statSync(requested);
    if (!st.isFile()) return new Response('Not found', { status: 404 });

    const ext = segments[segments.length - 1].slice(
      segments[segments.length - 1].lastIndexOf('.'),
    ).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream';

    const range = request.headers.get('range');
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (start >= st.size || end >= st.size || start > end) {
          return new Response(null, { status: 416 });
        }
        const stream = createReadStream(requested, { start, end });
        return new Response(stream as unknown as ReadableStream, {
          status: 206,
          headers: {
            'content-type': mime,
            'content-length': String(end - start + 1),
            'content-range': `bytes ${start}-${end}/${st.size}`,
            'accept-ranges': 'bytes',
            'cache-control': 'public, max-age=86400',
          },
        });
      }
    }

    const stream = createReadStream(requested);
    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'content-type': mime,
        'content-length': String(st.size),
        'accept-ranges': 'bytes',
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
