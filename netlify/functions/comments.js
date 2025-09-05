import { createClient } from '@supabase/supabase-js';

export async function handler(event, context) {
  const { headers, httpMethod, body, queryStringParameters } = event;
  
  console.log('Comments function called:', { 
    method: httpMethod,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY
  });

  // Check if service key is available
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_KEY not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Server configuration error: SUPABASE_SERVICE_KEY not set. Please add it to Netlify environment variables.' 
      })
    };
  }

  // Create admin client with service key that bypasses RLS
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Create a separate client just for auth verification
  const supabaseAuth = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );

  // Get the user's token from the Authorization header
  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) {
    console.log('No authorization token provided');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'No authorization token' })
    };
  }

  // Verify the user with their token using the anon client
  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
  if (userError || !user) {
    console.error('Invalid token:', userError);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid token' })
    };
  }

  console.log('User verified:', user.id);

  // Get user's profile and family_id using admin client
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, family_id, username, avatar_url')
    .eq('id', user.id)
    .single();

  console.log('User profile:', { userId: user.id, familyId: profile?.family_id });

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

        console.log('Getting comments for photo:', photo_id);

        // First check if user can see this photo (same family) using admin client
        const { data: photo } = await supabaseAdmin
          .from('photos')
          .select('id, family_id')
          .eq('id', photo_id)
          .single();

        if (!photo || photo.family_id !== profile.family_id) {
          console.log('Photo access denied:', { photoFamily: photo?.family_id, userFamily: profile.family_id });
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Cannot access this photo' })
          };
        }

        // Get comments with user profiles using admin client
        const { data: comments, error } = await supabaseAdmin
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
          throw error;
        }

        console.log(`Found ${comments?.length || 0} comments`);

        return {
          statusCode: 200,
          body: JSON.stringify(comments)
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

        // Check if user can see this photo using admin client
        const { data: photo } = await supabaseAdmin
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

        console.log('Adding comment to photo:', photo_id);

        // Insert comment using admin client
        const { data: newComment, error } = await supabaseAdmin
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
          throw error;
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

        // Update only if user owns the comment using admin client
        const { data: updatedComment, error } = await supabaseAdmin
          .from('photo_comments')
          .update({
            comment: comment.trim(),
            edited_at: new Date().toISOString()
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
        // Delete a comment
        const { comment_id } = queryStringParameters;
        
        if (!comment_id) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'comment_id required' })
          };
        }

        // Delete only if user owns the comment using admin client
        const { error } = await supabaseAdmin
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