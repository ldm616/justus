import { Handler } from '@netlify/functions';
import busboy from 'busboy';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.BUCKET_FAMILY_PHOTOS || 'family-photos';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  // Get user token from header
  const token = event.headers['x-sb-access-token'];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: 'Unauthorized - missing token' })
    };
  }

  // Verify token and get user
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ ok: false, error: 'Unauthorized - invalid token' })
    };
  }

  const userId = userData.user.id;

  return new Promise((resolve) => {
    const bb = busboy({ headers: event.headers });
    let fields: any = {};
    let fileBuffer: Buffer | null = null;
    let fileType = '';

    bb.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    bb.on('file', (_fieldname, file, info) => {
      fileType = info.mimeType;
      const chunks: Buffer[] = [];
      
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on('finish', async () => {
      try {
        // Validate inputs
        if (!fileBuffer) {
          resolve({
            statusCode: 400,
            body: JSON.stringify({ ok: false, error: 'No photo uploaded' })
          });
          return;
        }

        if (!fields.group_id) {
          resolve({
            statusCode: 400,
            body: JSON.stringify({ ok: false, error: 'group_id is required' })
          });
          return;
        }

        // Process image with sharp
        const image = sharp(fileBuffer).rotate(); // Auto-rotate based on EXIF
        const metadata = await image.metadata();

        // Generate paths
        const today = new Date().toISOString().split('T')[0];
        const uuid = crypto.randomUUID();
        const basePath = `${fields.group_id}/${userId}/${today}/${uuid}`;

        // Create derivatives
        const [original, mobile, square400] = await Promise.all([
          image.jpeg({ quality: 85 }).toBuffer(),
          image.resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer(),
          image.resize(400, 400, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer()
        ]);

        // Upload to storage
        const paths = {
          original: `original/${basePath}.jpg`,
          mobile: `mobile/${basePath}.jpg`,
          square400: `square400/${basePath}.jpg`
        };

        await Promise.all([
          supabase.storage.from(bucketName).upload(paths.original, original, { upsert: true }),
          supabase.storage.from(bucketName).upload(paths.mobile, mobile, { upsert: true }),
          supabase.storage.from(bucketName).upload(paths.square400, square400, { upsert: true })
        ]);

        // Call RPC to upsert photo record
        const { data, error } = await supabase.rpc('upsert_my_photo_today', {
          p_group_id: fields.group_id,
          p_caption: fields.caption || null,
          p_original_path: paths.original,
          p_mobile_path: paths.mobile,
          p_square_400_path: paths.square400,
          p_width: metadata.width || 0,
          p_height: metadata.height || 0
        });

        if (error) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ ok: false, error: error.message })
          });
          return;
        }

        resolve({
          statusCode: 200,
          body: JSON.stringify({ ok: true, id: data })
        });
      } catch (error: any) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ ok: false, error: error.message || 'Processing failed' })
        });
      }
    });

    bb.on('error', (error) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: error.message })
      });
    });

    // Parse the multipart data
    bb.write(Buffer.from(event.body || '', 'base64'));
    bb.end();
  });
};