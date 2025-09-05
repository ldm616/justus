import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const json = (body: any, status = 200) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  try {
    // Netlify lower-cases headers; support both just in case
    const authHeader =
      event.headers.authorization || (event.headers as any).Authorization || '';

    if (!authHeader?.startsWith('Bearer '))
      return json({ error: 'Missing auth token' }, 401);

    // User-scoped client: forward the browser JWT so RLS applies
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify token & get user id
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) return json({ error: 'Invalid token' }, 401);
    const userId = auth.user.id;

    // Log once to verify header flow (remove after testing)
    console.info('Comments function - auth.user.id:', userId);

    // ROUTES
    if (event.httpMethod === 'GET') {
      const photo_id = event.queryStringParameters?.photo_id;
      if (!photo_id) return json({ error: 'photo_id required' }, 400);

      const { data, error } = await supabase
        .from('photo_comments')
        .select('id, photo_id, user_id, comment, edited_at, created_at')
        .eq('photo_id', photo_id)
        .order('created_at', { ascending: false });

      if (error) {
        // Surface RLS / query issues as 4xx, not 500
        const status = error.code === '42501' ? 403 : 400;
        return json({ error: error.message, code: error.code }, status);
      }
      return json(data ?? []);
    }

    if (event.httpMethod === 'POST') {
      const { photo_id, comment } = JSON.parse(event.body || '{}');
      if (!photo_id || !comment?.trim())
        return json({ error: 'photo_id and comment required' }, 400);

      const { data, error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id,
          user_id: userId,
          comment: comment.trim(),
        })
        .select('id, photo_id, user_id, comment, edited_at, created_at')
        .single();

      if (error) {
        const status = error.code === '42501' ? 403 : 400;
        return json({ error: error.message, code: error.code }, status);
      }
      return json(data, 201);
    }

    if (event.httpMethod === 'PATCH') {
      const { comment_id, comment } = JSON.parse(event.body || '{}');
      if (!comment_id || !comment?.trim())
        return json({ error: 'comment_id and comment required' }, 400);

      const { data, error } = await supabase
        .from('photo_comments')
        .update({
          comment: comment.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', comment_id) // RLS limits to owner
        .select('id, photo_id, user_id, comment, edited_at, created_at')
        .single();

      if (error) {
        const status = error.code === '42501' ? 403 : 400;
        return json({ error: error.message, code: error.code }, status);
      }
      return json(data);
    }

    if (event.httpMethod === 'DELETE') {
      const comment_id = event.queryStringParameters?.comment_id;
      if (!comment_id) return json({ error: 'comment_id required' }, 400);

      const { error } = await supabase
        .from('photo_comments')
        .delete()
        .eq('id', comment_id); // RLS limits to owner

      if (error) {
        const status = error.code === '42501' ? 403 : 400;
        return json({ error: error.message, code: error.code }, status);
      }
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (e: any) {
    // Final safety net; keep 500s rare and informative
    return json({ error: e?.message ?? 'Server error' }, 500);
  }
};