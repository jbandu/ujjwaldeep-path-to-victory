import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for server operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header for verification
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create client with user's token for auth verification
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const today = new Date().toISOString().split('T')[0]

    // Get top users for today using the public view
    const { data: leaderboardData, error } = await supabase
      .from('leaderboard_daily_public')
      .select('*')
      .eq('day', today)
      .order('points', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Get profiles for display names using service role to access across users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    }

    // Create a map of user_id to display name
    const profileMap = new Map()
    if (profilesData) {
      profilesData.forEach(profile => {
        profileMap.set(profile.user_id, profile.full_name || 'Anonymous')
      })
    }

    // Add display names to leaderboard data
    const enrichedData = (leaderboardData || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      display_name: 'Anonymous' // Use anonymous since we're using the public view
    }))

    console.log(`Fetched daily leaderboard: ${enrichedData.length} entries`)

    return new Response(
      JSON.stringify({ leaderboard: enrichedData }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in leaderboard-daily:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})