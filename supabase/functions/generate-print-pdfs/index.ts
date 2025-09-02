import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { test_id, version = 1 } = await req.json()

    if (!test_id) {
      return new Response(
        JSON.stringify({ error: 'test_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch test data
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', test_id)
      .single()

    if (testError || !test) {
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user owns the test or is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    const isAdmin = profile?.is_admin || false
    const isOwner = test.owner_id === user.id

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to generate PDFs for this test' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get question IDs from test config
    const questionIds = test.config?.questions || []
    if (!questionIds.length) {
      return new Response(
        JSON.stringify({ error: 'Test has no questions configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch questions in the correct order
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, subject, chapter, stem, options, correct_index, difficulty')
      .in('id', questionIds)

    if (questionsError || !questions) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Order questions according to test config
    const orderedQuestions = questionIds.map(id => 
      questions.find(q => q.id.toString() === id.toString())
    ).filter(Boolean)

    // Generate QR payload
    const qrPayload = {
      test_id,
      version,
      layout_hash: generateLayoutHash(orderedQuestions),
      total_questions: orderedQuestions.length
    }

    // Generate QR code data URL
    const qrCodeDataUrl = await generateQRCode(qrPayload)

    // Create print package record
    const packageId = crypto.randomUUID()
    const paperPath = `${test_id}/${version}/paper.pdf`
    const omrPath = `${test_id}/${version}/omr.pdf`

    const { error: insertError } = await supabase
      .from('print_packages')
      .insert({
        id: packageId,
        test_id,
        version,
        paper_pdf_url: paperPath,
        omr_pdf_url: omrPath,
        qr_payload: qrPayload,
        created_by: user.id
      })

    if (insertError) {
      console.error('Failed to create print package:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create print package' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return the package info - PDF generation will be handled client-side
    return new Response(
      JSON.stringify({
        package_id: packageId,
        test_id,
        version,
        paper_pdf_url: paperPath,
        omr_pdf_url: omrPath,
        qr_payload: qrPayload,
        questions: orderedQuestions,
        test_duration: test.duration_sec,
        qr_code_data_url: qrCodeDataUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-print-pdfs:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateLayoutHash(questions: any[]): string {
  const questionIds = questions.map(q => q.id).join(',')
  return btoa(questionIds).slice(0, 16)
}

async function generateQRCode(payload: any): Promise<string> {
  // Simple QR code generation - in a real implementation you'd use a QR library
  // For now, return a placeholder data URL
  const dataString = JSON.stringify(payload)
  const canvas = new OffscreenCanvas(200, 200)
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // Draw a simple placeholder pattern
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#fff'
    ctx.fillRect(10, 10, 180, 180)
    ctx.fillStyle = '#000'
    ctx.font = '12px monospace'
    ctx.fillText('QR', 90, 100)
  }
  
  const blob = await canvas.convertToBlob()
  const buffer = await blob.arrayBuffer()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return `data:image/png;base64,${base64}`
}