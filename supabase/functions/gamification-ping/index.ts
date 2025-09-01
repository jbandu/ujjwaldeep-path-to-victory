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

    // Get user from auth header
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

    const userId = user.id
    const today = new Date().toISOString().split('T')[0]

    // Get or create gamification record
    const { data: gamificationData, error: fetchError } = await supabase
      .from('gamification')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw fetchError
    }

    let streakDays = 0
    let points = 0
    const pointsToAdd = 10 // Base points for daily activity

    if (gamificationData) {
      const lastActiveDate = gamificationData.last_active_date
      streakDays = gamificationData.streak_days || 0
      points = gamificationData.points || 0

      // Check if we need to update the streak
      if (lastActiveDate !== today) {
        const lastDate = new Date(lastActiveDate || '2000-01-01')
        const todayDate = new Date(today)
        const daysDifference = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDifference === 1) {
          // Continue streak
          streakDays += 1
          points += pointsToAdd + (streakDays * 2) // Bonus points for streak
        } else if (daysDifference > 1) {
          // Streak broken, reset
          streakDays = 1
          points += pointsToAdd
        }
      } else {
        // Same day, just add points
        points += pointsToAdd
      }

      // Update existing record
      const { error: updateError } = await supabase
        .from('gamification')
        .update({
          streak_days: streakDays,
          points: points,
          last_active_date: today
        })
        .eq('user_id', userId)

      if (updateError) throw updateError
    } else {
      // Create new record
      streakDays = 1
      points = pointsToAdd

      const { error: insertError } = await supabase
        .from('gamification')
        .insert({
          user_id: userId,
          streak_days: streakDays,
          points: points,
          last_active_date: today,
          badges: []
        })

      if (insertError) throw insertError
    }

    // Update daily leaderboard
    const { error: leaderboardError } = await supabase
      .from('leaderboard_daily')
      .upsert({
        user_id: userId,
        day: today,
        points: points
      }, {
        onConflict: 'user_id,day'
      })

    if (leaderboardError) throw leaderboardError

    console.log(`Updated gamification for user ${userId}: streak=${streakDays}, points=${points}`)

    return new Response(
      JSON.stringify({ 
        streak_days: streakDays, 
        points: points,
        points_added: pointsToAdd + (streakDays > 1 ? streakDays * 2 : 0)
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in gamification-ping:', error)
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