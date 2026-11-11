import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/server-utils.ts';
import { saveUpload, UploadValidationError } from '../../../lib/storage.ts';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonResponse({ error: 'no_file' }, { status: 400 });
  }
  const subdir = (form.get('subdir') as string) || 'misc';

  try {
    const saved = await saveUpload(file, subdir);
    return jsonResponse({ url: saved.url, size: saved.size, mimeType: saved.mimeType }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return jsonResponse({ error: 'upload_failed', message: err.message }, { status: err.status });
    }
    throw err;
  }
};
