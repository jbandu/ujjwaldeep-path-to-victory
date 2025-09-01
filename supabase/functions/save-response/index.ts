import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaveResponseRequest {
  questionId: number;
  selectedIndex: number;
  timeSpent?: number;
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

    // Parse request body
    const { questionId, selectedIndex, timeSpent }: SaveResponseRequest = await req.json()
    
    if (questionId === undefined || selectedIndex === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionId, selectedIndex' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Saving response for attempt:', attemptId, 'question:', questionId, 'answer:', selectedIndex)

    // Verify user owns this attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('user_id')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt || attempt.user_id !== user.id) {
      console.error('Attempt verification error:', attemptError)
      return new Response(
        JSON.stringify({ error: 'Attempt not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Upsert the response (insert or update if exists)
    const { error: responseError } = await supabase
      .from('items_attempted')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_index: selectedIndex,
        time_ms: timeSpent || 0,
        // correct field will be populated during submission when we compare with correct_index
      })

    if (responseError) {
      console.error('Response save error:', responseError)
      return new Response(
        JSON.stringify({ error: 'Failed to save response', details: responseError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Response saved successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Response saved successfully'
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