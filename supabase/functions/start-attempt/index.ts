import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StartAttemptRequest {
  testId: string;
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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { testId }: StartAttemptRequest = await req.json()
    
    if (!testId) {
      return new Response(
        JSON.stringify({ error: 'Test ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting attempt for user:', user.id, 'test:', testId)

    // Get test configuration
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      console.error('Test fetch error:', testError)
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user has access to this test (owner or shared)
    if (test.owner_id !== user.id && test.visibility === 'private') {
      return new Response(
        JSON.stringify({ error: 'Access denied to this test' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const config = test.config as any;
    console.log('Test config:', config)

    // Build question query based on test configuration
    let questionsQuery = supabase
      .from('questions')
      .select('*')
      .eq('status', 'active')

    // Filter by subjects
    if (config.subjects && config.subjects.length > 0) {
      questionsQuery = questionsQuery.in('subject', config.subjects)
    }

    // Filter by chapters if specified
    if (config.chapters && config.chapters.length > 0) {
      questionsQuery = questionsQuery.in('chapter', config.chapters)
    }

    // Filter by difficulty range
    if (config.difficulty && config.difficulty.length > 0) {
      const minDifficulty = Math.min(...config.difficulty)
      const maxDifficulty = Math.max(...config.difficulty)
      questionsQuery = questionsQuery
        .gte('difficulty', minDifficulty)
        .lte('difficulty', maxDifficulty)
    }

    // Get questions
    const { data: availableQuestions, error: questionsError } = await questionsQuery

    if (questionsError) {
      console.error('Questions fetch error:', questionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions', details: questionsError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!availableQuestions || availableQuestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No questions available for the selected criteria' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${availableQuestions.length} available questions`)

    // Randomly select the required number of questions
    const questionCount = Math.min(config.questionCount || 25, availableQuestions.length)
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random())
    const selectedQuestions = shuffled.slice(0, questionCount)

    console.log(`Selected ${selectedQuestions.length} questions for the test`)

    // Create attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        user_id: user.id,
        test_id: testId,
        started_at: new Date().toISOString(),
        summary: {
          selected_questions: selectedQuestions.map(q => q.id),
          total_questions: selectedQuestions.length,
          test_config: config
        }
      })
      .select()
      .single()

    if (attemptError) {
      console.error('Attempt creation error:', attemptError)
      return new Response(
        JSON.stringify({ error: 'Failed to create attempt', details: attemptError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Attempt created successfully:', attempt.id)

    // Return attempt with questions (without correct answers for security)
    const questionsForFrontend = selectedQuestions.map(q => ({
      id: q.id,
      subject: q.subject,
      chapter: q.chapter,
      stem: q.stem,
      options: q.options,
      difficulty: q.difficulty,
      // Note: correct_index and explanation are intentionally omitted for security
    }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        attempt: {
          id: attempt.id,
          test_id: attempt.test_id,
          started_at: attempt.started_at,
          duration_sec: test.duration_sec,
          questions: questionsForFrontend,
          total_questions: questionsForFrontend.length
        }
      }),
      { 
        status: 201, 
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