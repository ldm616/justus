// netlify/functions/process-photo.ts
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET       = process.env.BUCKET_FAMILY_PHOTOS || 'family-photos';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  if (!contentType || !contentType.startsWith('multipart/form-data')) {
    return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Expected multipart/form-data' }) };
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let family_id = '';
  let taken_at = new Date().toISOString().slice(0,10);
  let caption = '';
  let tagsCsv = '';
  let user_id = '';

  let fileBuffer: Buffer | null = null;
  let fileExt = 'jpg';

  // Parse body with busboy
  await new Promise<void>((resolve, reject) => {
    const bb = Busboy({ headers: { 'content-type': contentType } });

    bb.on('field', (name, val) => {
      if (name === 'family_id') family_id = val;
      if (name === 'taken_at')  taken_at  = val;
      if (name === 'caption')   caption   = val;
      if (name === 'tags')      tagsCsv   = val;
      if (name === 'user_id')   user_id   = val;
    });

    bb.on('file', (_name, file, info) => {
      const chunks: Buffer[] = [];
      const mime = info.mimeType || 'image/jpeg';
      fileExt = (mime.split('/')[1] || 'jpeg').replace('jpeg','jpg');
      file.on('data', (d: Buffer) => chunks.push(d));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('error', reject);
    bb.on('finish', resolve);

    const body = event.body ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8') : Buffer.alloc(0);
    bb.end(body);
  });

  // Validate
  if (!fileBuffer) return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Missing file' }) };
  if (!family_id)  return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Missing family_id' }) };
  if (!user_id)    return { statusCode: 400, body: JSON.stringify({ ok:false, error:'Missing user_id' }) };

  // Paths
  const uid = randomUUID();
  const base = `${user_id}/${taken_at}/${uid}`;
  const originalPath = `original/${base}.${fileExt}`;
  const mobilePath   = `mobile/${base}.jpg`;
  const squarePath   = `square400/${base}.jpg`;

  // Derivatives
  const img = sharp(fileBuffer).rotate();
  const meta = await img.metadata();

  const mobile = await sharp(fileBuffer).rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();

  const square = await sharp(fileBuffer).rotate()
    .resize({ width: 400, height: 400, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Upload original + derivatives
  const up1 = await supabase.storage.from(BUCKET).upload(originalPath, fileBuffer, { contentType: `image/${fileExt}`, upsert: true });
  if (up1.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: up1.error.message }) };

  const [up2, up3] = await Promise.all([
    supabase.storage.from(BUCKET).upload(mobilePath, mobile, { contentType: 'image/jpeg', upsert: true }),
    supabase.storage.from(BUCKET).upload(squarePath, square, { contentType: 'image/jpeg', upsert: true }),
  ]);
  if (up2.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: up2.error.message }) };
  if (up3.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: up3.error.message }) };

  // Insert photo row
  const ins = await supabase.from('photos').insert({
    family_id,
    user_id,
    caption,
    taken_at,
    original_path: originalPath,
    mobile_path: mobilePath,
    square_400_path: squarePath,
    width: meta.width ?? null,
    height: meta.height ?? null,
  }).select('id').single();

  if (ins.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: ins.error.message }) };

  // Tags
  const tags = tagsCsv.split(',').map(t => t.trim()).filter(Boolean);
  for (const name of tags) {
    const upTag = await supabase.from('tags')
      .upsert({ family_id, name }, { onConflict: 'family_id,name' })
      .select('id').single();
    if (upTag.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: upTag.error.message }) };

    const link = await supabase.from('tag_links')
      .insert({ photo_id: ins.data.id, tag_id: upTag.data!.id });
    if (link.error) return { statusCode: 500, body: JSON.stringify({ ok:false, error: link.error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, id: ins.data.id }) };
};