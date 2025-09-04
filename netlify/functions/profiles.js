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

  try {
    switch (httpMethod) {
      case 'GET': {
        // Get user's profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(profile)
        };
      }

      case 'PUT': {
        // Update profile
        const updates = JSON.parse(body);
        
        // Ensure updating only own profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(profile)
        };
      }

      case 'POST': {
        // Create profile (for new users)
        const { username, avatar_url } = JSON.parse(body);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username,
            avatar_url: avatar_url || null
          })
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(profile)
        };
      }

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Profiles function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}