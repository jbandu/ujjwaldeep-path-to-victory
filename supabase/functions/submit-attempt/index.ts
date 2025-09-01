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

    if (req.method !== 'POST') {
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
    const attemptIndex = pathParts.indexOf('attempts')
    const attemptId = attemptIndex >= 0 ? pathParts[attemptIndex + 1] : null
    
    if (!attemptId) {
      return new Response(
        JSON.stringify({ error: 'Attempt ID is required in URL path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Submitting attempt:', attemptId)

    // Verify user owns this attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single()

    if (attemptError || !attempt) {
      console.error('Attempt verification error:', attemptError)
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
        JSON.stringify({ error: 'Attempt already submitted' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all responses for this attempt
    const { data: responses, error: responsesError } = await supabase
      .from('items_attempted')
      .select('*')
      .eq('attempt_id', attemptId)

    if (responsesError) {
      console.error('Responses fetch error:', responsesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch responses', details: responsesError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${responses?.length || 0} responses to evaluate`)

    // Get questions with correct answers
    const questionIds = responses?.map(r => r.question_id) || []
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_index')
      .in('id', questionIds)

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

    // Create a map for quick lookup
    const correctAnswers = new Map(questions?.map(q => [q.id, q.correct_index]) || [])

    // Calculate score and update response correctness
    let correctCount = 0
    const totalQuestions = (attempt.summary as any)?.total_questions || responses?.length || 0

    if (responses) {
      for (const response of responses) {
        const correctAnswer = correctAnswers.get(response.question_id)
        const isCorrect = correctAnswer !== undefined && response.selected_index === correctAnswer
        
        if (isCorrect) {
          correctCount++
        }

        // Update the response with correctness
        await supabase
          .from('items_attempted')
          .update({ correct: isCorrect })
          .eq('attempt_id', attemptId)
          .eq('question_id', response.question_id)
      }
    }

    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

    console.log(`Score calculation: ${correctCount}/${totalQuestions} = ${score.toFixed(2)}%`)

    // Update attempt with submission data
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score: parseFloat(score.toFixed(2)),
        summary: {
          ...(attempt.summary as object || {}),
          correct_answers: correctCount,
          total_questions: totalQuestions,
          percentage: parseFloat(score.toFixed(2)),
          submitted_at: new Date().toISOString()
        }
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError) {
      console.error('Attempt update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update attempt', details: updateError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Attempt submitted successfully with score:', score)

    return new Response(
      JSON.stringify({ 
        success: true,
        score: parseFloat(score.toFixed(2)),
        correct_answers: correctCount,
        total_questions: totalQuestions,
        attempt_id: attemptId
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