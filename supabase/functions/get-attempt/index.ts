import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract attempt ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const attemptId = pathParts[pathParts.length - 1]
    
    if (!attemptId) {
      return new Response(
        JSON.stringify({ error: 'Attempt ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Getting attempt:', attemptId, 'for user:', user.id)

    // Get attempt data
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single()

    if (attemptError || !attempt) {
      console.error('Attempt fetch error:', attemptError)
      return new Response(
        JSON.stringify({ error: 'Attempt not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if already submitted
    if (attempt.submitted_at) {
      return new Response(
        JSON.stringify({ error: 'Attempt already submitted', redirectTo: `/app/results/${attemptId}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get test data for duration and user language preference
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('duration_sec')
      .eq('id', attempt.test_id)
      .single()

    if (testError) {
      console.error('Test fetch error:', testError)
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch user profile to determine language preference for questions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.warn('Profile fetch error (continuing with English):', profileError)
    }

    const userLangName = (profile?.language || 'English').trim()
    const langMap: Record<string, string> = { English: 'en', Hindi: 'hi', Telugu: 'te', Tamil: 'ta' }
    const userLangCode = langMap[userLangName] || 'en'

    // Get questions from the attempt summary
    const summary = attempt.summary as any;
    const questionIds = summary?.selected_questions || []

    if (questionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions found for this attempt' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get questions (without correct answers for security)
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, subject, chapter, stem, options, difficulty')
      .in('id', questionIds)

    if (questionsError) {
      console.error('Questions fetch error:', questionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Apply localization if available and preferred language is not English
    let localizedMap = new Map<number, any>()
    if (userLangCode !== 'en') {
      const { data: locs, error: locsError } = await supabase
        .from('question_localizations')
        .select('question_id, stem, options, explanation')
        .in('question_id', questionIds)
        .eq('language', userLangCode)

      if (locsError) {
        console.warn('Localization fetch error (continuing without localization):', locsError)
      } else if (locs && locs.length > 0) {
        localizedMap = new Map(locs.map((l: any) => [l.question_id, l]))
      }
    }

    // Get existing responses
    const { data: responses, error: responsesError } = await supabase
      .from('items_attempted')
      .select('question_id, selected_index')
      .eq('attempt_id', attemptId)

    if (responsesError) {
      console.error('Responses fetch error:', responsesError)
      // Don't fail here, just continue without existing responses
    }

    // Create a map of existing responses
    const responseMap = new Map(responses?.map(r => [r.question_id, r.selected_index]) || [])

    // Sort questions according to the original order and merge localizations
    const sortedQuestions = questionIds
      .map((id: number) => questions?.find(q => q.id === id))
      .filter(Boolean)
      .map((q: any) => {
        const loc = localizedMap.get(q.id)
        return loc
          ? { ...q, stem: loc.stem ?? q.stem, options: loc.options ?? q.options }
          : q
      })

    console.log(`Found ${sortedQuestions.length} questions for attempt. Language preference: ${userLangName} (${userLangCode})`)

    // Calculate time remaining
    const startTime = new Date(attempt.started_at).getTime()
    const currentTime = Date.now()
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
    const timeRemaining = Math.max(0, test.duration_sec - elapsedSeconds)

    return new Response(
      JSON.stringify({ 
        id: attempt.id,
        test_id: attempt.test_id,
        started_at: attempt.started_at,
        duration_sec: test.duration_sec,
        time_remaining: timeRemaining,
        questions: sortedQuestions,
        total_questions: sortedQuestions.length,
        existing_responses: Object.fromEntries(responseMap)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})