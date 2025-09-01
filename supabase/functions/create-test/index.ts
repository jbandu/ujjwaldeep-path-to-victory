import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestConfig {
  subjects: string[];
  chapters: string[];
  difficulty: number[];
  questionCount: number;
  duration: number;
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
    const testConfig: TestConfig = await req.json()
    
    // Validate required fields
    if (!testConfig.subjects || testConfig.subjects.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one subject is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!testConfig.questionCount || !testConfig.duration) {
      return new Response(
        JSON.stringify({ error: 'Question count and duration are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating test for user:', user.id)
    console.log('Test config:', testConfig)

    // Create test record
    const { data: test, error: insertError } = await supabase
      .from('tests')
      .insert({
        owner_id: user.id,
        config: {
          subjects: testConfig.subjects,
          chapters: testConfig.chapters || [],
          difficulty: testConfig.difficulty || [3],
          questionCount: testConfig.questionCount,
        },
        duration_sec: testConfig.duration * 60, // Convert minutes to seconds
        mode: 'practice', // Default mode
        visibility: 'private', // Default visibility
        total_marks: testConfig.questionCount, // Assuming 1 mark per question
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create test', details: insertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Test created successfully:', test.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        test: {
          id: test.id,
          config: test.config,
          duration_sec: test.duration_sec,
          created_at: test.created_at
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