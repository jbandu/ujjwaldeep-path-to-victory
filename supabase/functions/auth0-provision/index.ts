import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-provisioning-secret',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate provisioning secret
    const provisioningSecret = req.headers.get('x-provisioning-secret');
    const expectedSecret = Deno.env.get('PROVISIONING_SECRET');
    
    if (!expectedSecret) {
      console.error('PROVISIONING_SECRET not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!provisioningSecret || provisioningSecret !== expectedSecret) {
      console.error('Invalid or missing provisioning secret');
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const { auth0_user_id, email, full_name } = body;

    if (!auth0_user_id || !email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required fields: auth0_user_id, email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ ok: false, error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert user into public.users table
    const { data, error } = await supabase
      .from('users')
      .upsert({
        auth0_user_id,
        email,
        full_name: full_name || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'auth0_user_id'
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'Database operation failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully provisioned user:', { auth0_user_id, email });
    
    return new Response(
      JSON.stringify({ ok: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});