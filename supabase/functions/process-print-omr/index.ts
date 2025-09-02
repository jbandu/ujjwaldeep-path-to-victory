import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin token for background processing
    const adminToken = req.headers.get('x-admin-token')
    if (adminToken !== Deno.env.get('ADMIN_TASK_TOKEN')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid admin token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { upload_id } = await req.json()

    if (!upload_id) {
      return new Response(
        JSON.stringify({ error: 'upload_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get upload record
    const { data: upload, error: uploadError } = await supabase
      .from('print_uploads')
      .select('*')
      .eq('id', upload_id)
      .single()

    if (uploadError || !upload) {
      return new Response(
        JSON.stringify({ error: 'Upload not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (upload.status !== 'received') {
      return new Response(
        JSON.stringify({ error: 'Upload already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to processing
    await supabase
      .from('print_uploads')
      .update({ status: 'processing' })
      .eq('id', upload_id)

    try {
      // Get test and questions data
      const { data: test } = await supabase
        .from('tests')
        .select('id, config, duration_sec')
        .eq('id', upload.test_id)
        .single()

      if (!test) {
        throw new Error('Test not found')
      }

      const questionIds = test.config?.questions || []
      const { data: questions } = await supabase
        .from('questions')
        .select('id, correct_index')
        .in('id', questionIds)

      if (!questions) {
        throw new Error('Questions not found')
      }

      // Order questions according to test config
      const orderedQuestions = questionIds.map((id: any) => 
        questions.find(q => q.id.toString() === id.toString())
      ).filter(Boolean)

      // Download and process files
      const imageBuffers: Uint8Array[] = []
      
      for (const filePath of upload.upload_urls) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('print-uploads')
          .download(filePath)

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${filePath}`)
        }

        // Convert file to buffer
        const buffer = new Uint8Array(await fileData.arrayBuffer())
        imageBuffers.push(buffer)
      }

      // Process with OpenAI Vision
      const detectionResult = await detectAnswers(imageBuffers, {
        questionCount: orderedQuestions.length,
        startIndex: 1
      })

      // Create or find attempt
      let attemptId = upload.attempt_id

      if (!attemptId) {
        const { data: attempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            test_id: upload.test_id,
            user_id: upload.user_id,
            started_at: upload.created_at
          })
          .select('id')
          .single()

        if (attemptError) {
          throw new Error('Failed to create attempt')
        }

        attemptId = attempt.id

        // Update upload with attempt ID
        await supabase
          .from('print_uploads')
          .update({ attempt_id: attemptId })
          .eq('id', upload_id)
      }

      // Process detected answers
      let correctCount = 0
      const itemsToInsert = []

      for (const answer of detectionResult.answers) {
        const question = orderedQuestions[answer.q - 1]
        if (!question) continue

        const isCorrect = question.correct_index === answer.sel
        if (isCorrect) correctCount++

        itemsToInsert.push({
          attempt_id: attemptId,
          question_id: question.id,
          selected_index: answer.sel,
          correct: isCorrect,
          time_ms: 0 // No time tracking for print mode
        })
      }

      // Insert items_attempted
      if (itemsToInsert.length > 0) {
        await supabase
          .from('items_attempted')
          .insert(itemsToInsert)
      }

      // Calculate score and update attempt
      const totalQuestions = orderedQuestions.length
      const score = (correctCount / totalQuestions) * 100
      const accuracy = correctCount / totalQuestions

      const summary = {
        total_questions: totalQuestions,
        attempted: detectionResult.answers.length,
        correct: correctCount,
        incorrect: detectionResult.answers.length - correctCount,
        accuracy: accuracy,
        score: score,
        subject_breakdown: calculateSubjectBreakdown(detectionResult.answers, orderedQuestions)
      }

      await supabase
        .from('attempts')
        .update({
          score: score,
          summary: summary,
          submitted_at: new Date().toISOString()
        })
        .eq('id', attemptId)

      // Determine final status
      const lowConfidenceCount = detectionResult.answers.filter(a => a.conf < 0.6).length
      const finalStatus = lowConfidenceCount > 0 ? 'needs_review' : 'graded'

      // Update upload status
      await supabase
        .from('print_uploads')
        .update({
          status: finalStatus,
          detected: detectionResult
        })
        .eq('id', upload_id)

      return new Response(
        JSON.stringify({
          success: true,
          upload_id,
          attempt_id: attemptId,
          status: finalStatus,
          detected_answers: detectionResult.answers.length,
          score: score,
          accuracy: accuracy
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (processingError) {
      console.error('Processing error:', processingError)
      
      // Update status to error
      await supabase
        .from('print_uploads')
        .update({
          status: 'error',
          error: processingError.message
        })
        .eq('id', upload_id)

      return new Response(
        JSON.stringify({
          success: false,
          error: processingError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in process-print-omr:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function detectAnswers(imageBuffers: Uint8Array[], meta: any): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Convert buffers to base64
  const base64Images = imageBuffers.map(buffer => 
    `data:image/jpeg;base64,${btoa(String.fromCharCode(...buffer))}`
  )

  const systemPrompt = `You are an OMR engine for NEET answer sheets. Return ONLY JSON: {"answers":[{"q":1,"sel":0,"conf":0.95}],"warnings":["..."]}. q=question number, sel=option (0=A,1=B,2=C,3=D), conf=confidence 0-1.`

  const userPrompt = `Analyze this OMR sheet. Questions ${meta.startIndex} to ${meta.startIndex + meta.questionCount - 1}. Look for dark filled bubbles in A,B,C,D grid format.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...base64Images.map(image => ({
              type: 'image_url',
              image_url: { url: image, detail: 'high' }
            }))
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1000,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content
  
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  return JSON.parse(content)
}

function calculateSubjectBreakdown(answers: any[], questions: any[]): any {
  const breakdown: any = {}
  
  for (const answer of answers) {
    const question = questions[answer.q - 1]
    if (!question) continue
    
    const subject = question.subject || 'Unknown'
    if (!breakdown[subject]) {
      breakdown[subject] = { attempted: 0, correct: 0 }
    }
    
    breakdown[subject].attempted++
    if (question.correct_index === answer.sel) {
      breakdown[subject].correct++
    }
  }
  
  return breakdown
}