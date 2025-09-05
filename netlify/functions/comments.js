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

  // Create client with anon key and user's token
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );

  // Verify the token is valid
  const { data: { user }, error: userError } = await supabase.auth.getUser();
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

        // Debug: Log the request details
        console.log('=== COMMENTS DEBUG ===');
        console.log('User ID:', user.id);
        console.log('Photo ID:', photo_id);
        
        // First, get the user's family_id
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('family_id')
          .eq('id', user.id)
          .single();
        
        console.log('User Profile:', userProfile);
        console.log('User Family ID:', userProfile?.family_id);
        
        // Get the photo's family_id
        const { data: photo, error: photoError } = await supabase
          .from('photos')
          .select('family_id')
          .eq('id', photo_id)
          .single();
        
        console.log('Photo:', photo);
        console.log('Photo Family ID:', photo?.family_id);
        
        // SQL query being executed
        const sqlQuery = `
          SELECT pc.*, p.username, p.avatar_url 
          FROM photo_comments pc
          LEFT JOIN profiles p ON pc.user_id = p.id
          WHERE pc.photo_id = '${photo_id}'
          ORDER BY pc.created_at DESC
        `;
        console.log('SQL Query (equivalent):', sqlQuery);

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

        if (error) {
          console.error('Error fetching comments:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
          return {
            statusCode: error.code === '42501' ? 403 : 500,
            body: JSON.stringify({ error: error.message })
          };
        }

        console.log('Comments found:', comments?.length || 0);
        console.log('=== END DEBUG ===');

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
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error adding comment:', error);
          return {
            statusCode: error.code === '42501' ? 403 : 500,
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

        // Update only if user owns it
        const { data: updatedComment, error } = await supabase
          .from('photo_comments')
          .update({
            comment: comment.trim(),
            edited_at: new Date().toISOString()
          })
          .eq('id', comment_id)
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .single();

        if (error) {
          console.error('Error updating comment:', error);
          return {
            statusCode: error.code === '42501' ? 403 : 500,
            body: JSON.stringify({ error: error.message })
          };
        }
        
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
          .eq('id', comment_id);

        if (error) {
          console.error('Error deleting comment:', error);
          return {
            statusCode: error.code === '42501' ? 403 : 500,
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