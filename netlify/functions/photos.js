import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event, context) {
  const { headers, httpMethod, body, queryStringParameters } = event;

  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No authorization token' })
    };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, username')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'User not in a family' })
    };
  }

  try {
    switch (httpMethod) {
      case 'GET': {
        // Get family photos
        const { data: photos, error } = await supabase
          .from('photos')
          .select(`
            id,
            user_id,
            photo_url,
            medium_url,
            thumbnail_url,
            created_at,
            upload_date,
            family_id,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('family_id', profile.family_id)
          .order('upload_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(photos)
        };
      }

      case 'POST': {
        // Upload photo metadata
        const photoData = JSON.parse(body);
        
        // Ensure user is uploading to their family
        photoData.family_id = profile.family_id;
        photoData.user_id = user.id;

        const { data: photo, error } = await supabase
          .from('photos')
          .insert(photoData)
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(photo)
        };
      }

      case 'PUT': {
        // Update photo (for replacements)
        const { photo_id, ...updateData } = JSON.parse(body);
        
        const { data: photo, error } = await supabase
          .from('photos')
          .update(updateData)
          .eq('id', photo_id)
          .eq('user_id', user.id) // Only update own photos
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(photo)
        };
      }

      case 'DELETE': {
        // Delete photo
        const { photo_id } = queryStringParameters;
        
        const { error } = await supabase
          .from('photos')
          .delete()
          .eq('id', photo_id)
          .eq('user_id', user.id); // Only delete own photos

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true })
        };
      }

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Photos function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}