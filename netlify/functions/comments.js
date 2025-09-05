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

  // Create a single client with anon key
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  // Verify the token is valid
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
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

        console.log('Fetching comments for photo:', photo_id);
        console.log('User:', user.id);

        // Try the simplest possible query first
        const { data: comments, error } = await supabase
          .from('photo_comments')
          .select('*')
          .eq('photo_id', photo_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching comments:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: error.message,
              code: error.code,
              details: error.details 
            })
          };
        }

        // Now get the profiles separately
        if (comments && comments.length > 0) {
          const userIds = [...new Set(comments.map(c => c.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          // Map profiles to comments
          const profileMap = {};
          if (profiles) {
            profiles.forEach(p => {
              profileMap[p.id] = p;
            });
          }

          // Add profile data to comments
          const commentsWithProfiles = comments.map(c => ({
            ...c,
            profiles: profileMap[c.user_id] || null
          }));

          return {
            statusCode: 200,
            body: JSON.stringify(commentsWithProfiles)
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

        // Insert comment
        const { data: newComment, error } = await supabase
          .from('photo_comments')
          .insert({
            photo_id,
            user_id: user.id,
            comment: comment.trim()
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: error.message,
              code: error.code,
              details: error.details 
            })
          };
        }

        // Get the user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        return {
          statusCode: 200,
          body: JSON.stringify({
            ...newComment,
            profiles: profile || null
          })
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

        // Update comment - let RLS handle ownership check
        const { data: updatedComment, error } = await supabase
          .from('photo_comments')
          .update({
            comment: comment.trim(),
            edited_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .eq('user_id', user.id) // Only update if user owns it
          .select()
          .single();

        if (error) {
          console.error('Error updating comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: error.message,
              code: error.code,
              details: error.details 
            })
          };
        }

        if (!updatedComment) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Comment not found or not yours' })
          };
        }

        // Get the user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();

        return {
          statusCode: 200,
          body: JSON.stringify({
            ...updatedComment,
            profiles: profile || null
          })
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

        // Delete comment - let RLS handle ownership check
        const { error } = await supabase
          .from('photo_comments')
          .delete()
          .eq('id', comment_id)
          .eq('user_id', user.id); // Only delete if user owns it

        if (error) {
          console.error('Error deleting comment:', error);
          return {
            statusCode: 500,
            body: JSON.stringify({ 
              error: error.message,
              code: error.code,
              details: error.details 
            })
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