import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { email, tempPassword, familyName, inviterName } = await req.json()

    // Here you would use a service like SendGrid or Resend
    // For now, this is a placeholder
    const emailHtml = `
      <h2>You're invited to join ${familyName} on JustUs!</h2>
      <p>${inviterName} has invited you to share daily photos with your family.</p>
      <p><strong>Your temporary login details:</strong></p>
      <p>Email: ${email}<br>
      Temporary Password: ${tempPassword}</p>
      <p><a href="${Deno.env.get('SITE_URL')}/login">Click here to log in</a></p>
      <p>You'll be asked to set a new password on your first login.</p>
    `

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    // await resend.emails.send({
    //   from: 'JustUs <noreply@yourapp.com>',
    //   to: email,
    //   subject: `Invitation to join ${familyName}`,
    //   html: emailHtml
    // })

    return new Response(
      JSON.stringify({ success: true, message: 'Invitation sent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})