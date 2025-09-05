import { createClient } from '@supabase/supabase-js';

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

  // First, create a client with anon key to verify the user
  const anonClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  // Verify the token is valid
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  // Now create a service client that bypasses RLS
  // If no service key, use anon key with RLS bypass disabled
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      }
    }
  );

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

        // First check if user can access this photo (same family check)
        const { data: photo } = await supabase
          .from('photos')
          .select('family_id')
          .eq('id', photo_id)
          .single();

        if (photo) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('family_id')
            .eq('id', user.id)
            .single();

          if (!userProfile || userProfile.family_id !== photo.family_id) {
            return {
              statusCode: 403,
              body: JSON.stringify({ error: 'Cannot access photos from other families' })
            };
          }
        }

        // Get comments with user profiles embedded
        const { data: comments, error } = await supabase
          .from('photo_comments')
          .select(`
            *,
            profiles!photo_comments_user_id_fkey (
              username,
              avatar_url
            )
          `)
          .eq('photo_id', photo_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching comments:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
          };
        }

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
          .select('family_id')
          .eq('id', photo_id)
          .single();

        if (photo) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('family_id')
            .eq('id', user.id)
            .single();

          if (!userProfile || userProfile.family_id !== photo.family_id) {
            return {
              statusCode: 403,
              body: JSON.stringify({ error: 'Cannot comment on photos from other families' })
            };
          }
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
            profiles!photo_comments_user_id_fkey (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error adding comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
          };
        }

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

        // First check if user owns this comment
        const { data: existingComment } = await supabase
          .from('photo_comments')
          .select('user_id')
          .eq('id', comment_id)
          .single();

        if (!existingComment || existingComment.user_id !== user.id) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'You can only edit your own comments' })
          };
        }

        // Update comment
        const { data: updatedComment, error } = await supabase
          .from('photo_comments')
          .update({
            comment: comment.trim(),
            edited_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .select(`
            *,
            profiles!photo_comments_user_id_fkey (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error updating comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
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

        // First check if user owns this comment
        const { data: existingComment } = await supabase
          .from('photo_comments')
          .select('user_id')
          .eq('id', comment_id)
          .single();

        if (!existingComment || existingComment.user_id !== user.id) {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'You can only delete your own comments' })
          };
        }

        // Delete comment
        const { error } = await supabase
          .from('photo_comments')
          .delete()
          .eq('id', comment_id);

        if (error) {
          console.error('Error deleting comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
          };
        }

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