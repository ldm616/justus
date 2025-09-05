import { createClient } from '@supabase/supabase-js';

// Single supabase client with service key - EXACTLY like photos.js
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function handler(event, context) {
  const { headers, httpMethod, body, queryStringParameters } = event;

  // Get token from header
  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No authorization token' })
    };
  }

  // Verify user with their token
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  // Get user's profile and family_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, username, avatar_url')
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
        // Get comments for a photo
        const { photo_id } = queryStringParameters;
        if (!photo_id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'photo_id required' })
          };
        }

        // Check if photo is in user's family
        const { data: photo } = await supabase
          .from('photos')
          .select('id, family_id')
          .eq('id', photo_id)
          .single();

        if (!photo || photo.family_id !== profile.family_id) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Cannot access this photo' })
          };
        }

        // Get comments with user profiles embedded
        const { data: comments, error } = await supabase
          .from('photo_comments')
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('photo_id', photo_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(comments || [])
        };
      }

      case 'POST': {
        // Add a comment
        const { photo_id, comment } = JSON.parse(body);
        
        if (!photo_id || !comment) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'photo_id and comment required' })
          };
        }

        // Check if photo is in user's family
        const { data: photo } = await supabase
          .from('photos')
          .select('id, family_id')
          .eq('id', photo_id)
          .single();

        if (!photo || photo.family_id !== profile.family_id) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Cannot comment on this photo' })
          };
        }

        // Insert comment
        const { data: newComment, error } = await supabase
          .from('photo_comments')
          .insert({
            photo_id,
            user_id: user.id,
            comment: comment.trim()
          })
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(newComment)
        };
      }

      case 'PATCH': {
        // Update a comment
        const { comment_id, comment } = JSON.parse(body);
        
        if (!comment_id || !comment) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'comment_id and comment required' })
          };
        }

        // Update only if user owns it
        const { data: updatedComment, error } = await supabase
          .from('photo_comments')
          .update({
            comment: comment.trim(),
            edited_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .eq('user_id', user.id)
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) throw error;
        
        if (!updatedComment) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Comment not found or not yours' })
          };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(updatedComment)
        };
      }

      case 'DELETE': {
        // Delete a comment
        const { comment_id } = queryStringParameters;
        
        if (!comment_id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'comment_id required' })
          };
        }

        // Delete only if user owns it
        const { error } = await supabase
          .from('photo_comments')
          .delete()
          .eq('id', comment_id)
          .eq('user_id', user.id);

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
    console.error('Comments function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}