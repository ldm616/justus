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
    .select('id, family_id')
    .eq('id', user.id)
    .single();

  try {
    switch (httpMethod) {
      case 'GET': {
        // Get family info and members
        if (!profile?.family_id) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Not in a family' })
          };
        }

        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', profile.family_id)
          .single();

        if (familyError) throw familyError;

        const { data: members, error: membersError } = await supabase
          .from('family_members')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              avatar_url
            )
          `)
          .eq('family_id', profile.family_id)
          .order('joined_at', { ascending: true });

        if (membersError) throw membersError;

        return {
          statusCode: 200,
          body: JSON.stringify({ family, members })
        };
      }

      case 'POST': {
        // Create family
        const { name } = JSON.parse(body);
        
        // Create family
        const { data: family, error: familyError } = await supabase
          .from('families')
          .insert({
            name,
            created_by: user.id
          })
          .select()
          .single();

        if (familyError) throw familyError;

        // Add user as admin member
        const { error: memberError } = await supabase
          .from('family_members')
          .insert({
            family_id: family.id,
            user_id: user.id,
            role: 'admin'
          });

        if (memberError) throw memberError;

        // Update user's profile with family_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ family_id: family.id })
          .eq('id', user.id);

        if (profileError) throw profileError;

        return {
          statusCode: 200,
          body: JSON.stringify(family)
        };
      }

      case 'PUT': {
        // Update family (admin only)
        const { family_id, ...updates } = JSON.parse(body);
        
        // Check if user is admin
        const { data: membership } = await supabase
          .from('family_members')
          .select('role')
          .eq('family_id', family_id)
          .eq('user_id', user.id)
          .single();

        if (membership?.role !== 'admin') {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Admin access required' })
          };
        }

        const { data: family, error } = await supabase
          .from('families')
          .update(updates)
          .eq('id', family_id)
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(family)
        };
      }

      case 'DELETE': {
        // Remove member from family
        const { member_id } = queryStringParameters;
        
        // Check if user is admin
        const { data: membership } = await supabase
          .from('family_members')
          .select('role')
          .eq('family_id', profile.family_id)
          .eq('user_id', user.id)
          .single();

        if (membership?.role !== 'admin') {
          return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Admin access required' })
          };
        }

        // Remove member
        const { error } = await supabase
          .from('family_members')
          .delete()
          .eq('user_id', member_id)
          .eq('family_id', profile.family_id);

        if (error) throw error;

        // Update member's profile
        await supabase
          .from('profiles')
          .update({ family_id: null })
          .eq('id', member_id);

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
    console.error('Families function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}