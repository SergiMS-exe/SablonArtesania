import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export class UploadValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface SavedUpload {
  url: string;       // URL pública, p. ej. /media/products/abc.jpg
  absPath: string;   // ruta absoluta en disco
  size: number;
  mimeType: string;
}

export function getMediaDir(): string {
  return process.env.MEDIA_DIR ?? resolve(process.cwd(), 'media');
}

export async function saveUpload(
  file: File,
  subdir = 'products',
): Promise<SavedUpload> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadValidationError(`Tipo de archivo no permitido: ${file.type}`);
  }
  if (file.size > MAX_BYTES) {
    throw new UploadValidationError('La imagen supera 5 MB', 413);
  }
  const buf = Buffer.from(await file.arrayBuffer());

  const dir = join(getMediaDir(), subdir);
  await mkdir(dir, { recursive: true });
  const ext = EXT_BY_TYPE[file.type] ?? extname(file.name).toLowerCase() ?? '.bin';
  const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
  const absPath = join(dir, filename);
  await writeFile(absPath, buf);

  return {
    url: `/media/${subdir}/${filename}`,
    absPath,
    size: buf.length,
    mimeType: file.type,
  };
}

export async function removeUpload(url: string): Promise<void> {
  if (!url.startsWith('/media/')) return;
  const rel = url.replace(/^\/media\//, '');
  const abs = join(getMediaDir(), rel);
  try {
    const s = await stat(abs);
    if (s.isFile()) {
      const { unlink } = await import('node:fs/promises');
      await unlink(abs);
    }
  } catch {
    /* el archivo ya no existía, lo ignoramos */
  }
}
