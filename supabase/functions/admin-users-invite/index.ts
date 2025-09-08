import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteUserRequest {
  email: string;
  full_name?: string;
  is_admin?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Create user client to verify admin status
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is admin
    const { error: guardErr } = await userClient.rpc('assert_is_admin')
    if (guardErr) {
      console.error('Admin guard failed:', guardErr)
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Create service client
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse request body
    const { email, full_name, is_admin = false }: InviteUserRequest = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Send invitation
    const siteUrl = Deno.env.get('SITE_URL') || 'https://ujjwaldeep-path-to-victory.lovable.app/'
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${siteUrl}auth/callback`,
        data: {
          full_name,
          is_admin
        }
      }
    )

    if (inviteError) {
      console.error('Invite error:', inviteError)
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // If user should be admin, update profile
    if (is_admin && inviteData.user) {
      const { error: profileError } = await serviceClient.rpc('admin_upsert_profile', {
        p_user_id: inviteData.user.id,
        p_full_name: full_name,
        p_is_admin: true
      })

      if (profileError) {
        console.error('Profile update error:', profileError)
        // Don't fail the invite, just log the error
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: inviteData.user }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})