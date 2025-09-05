import { createClient } from '@supabase/supabase-js';

// Create two clients: one for auth validation, one for data operations
const serviceClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper to create client with user's JWT for RLS
function createUserClient(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );
}

export async function handler(event, context) {
  const { headers, httpMethod, body, queryStringParameters } = event;

  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No authorization token' })
    };
  }

  // Use service client to validate token
  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  // Create user-scoped client for RLS operations
  const userClient = createUserClient(token);

  try {
    switch (httpMethod) {
      case 'GET': {
        const { photo_id } = queryStringParameters;
        if (!photo_id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'photo_id required' })
          };
        }

        const { data: comments, error } = await userClient
          .from('comments')  // Changed from photo_comments
          .select('id, photo_id, user_id, body, created_at, updated_at')
          .eq('photo_id', photo_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(comments || [])
        };
      }

      case 'POST': {
        const { photo_id, comment } = JSON.parse(body);
        
        if (!photo_id || !comment) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'photo_id and comment required' })
          };
        }

        // Don't set family_id - trigger will handle it
        const { data: newComment, error } = await userClient
          .from('comments')  // Changed from photo_comments
          .insert({
            photo_id,
            user_id: user.id,
            body: comment.trim()  // Changed from comment to body
          })
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(newComment)
        };
      }

      case 'PATCH': {
        const { comment_id, comment } = JSON.parse(body);
        
        if (!comment_id || !comment) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'comment_id and comment required' })
          };
        }

        const { data: updatedComment, error } = await userClient
          .from('comments')  // Changed from photo_comments
          .update({
            body: comment.trim()  // Changed from comment to body
            // updated_at is handled by trigger
          })
          .eq('id', comment_id)
          .eq('user_id', user.id)
          .select()
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
        const { comment_id } = queryStringParameters;
        
        if (!comment_id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'comment_id required' })
          };
        }

        const { error } = await userClient
          .from('comments')  // Changed from photo_comments
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