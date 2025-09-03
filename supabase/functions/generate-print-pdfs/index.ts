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

    // Generate actual PDF files using React PDF components
    const { PDFDocument, StandardFonts, rgb } = await import('https://esm.sh/pdf-lib@1.17.1')
    
    // Create Question Paper PDF
    const questionPdf = await PDFDocument.create()
    let questionPage = questionPdf.addPage([595.28, 841.89]) // A4
    const questionFont = await questionPdf.embedFont(StandardFonts.Helvetica)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addQuestionHeader = (page: any) => {
      page.drawText(`Test ID: ${test_id} | Version: ${version}`, {
        x: 50, y: 800, size: 12, font: questionFont, color: rgb(0, 0, 0)
      })
      page.drawText(`Duration: ${Math.floor(test.duration_sec / 60)} minutes`, {
        x: 50, y: 780, size: 10, font: questionFont, color: rgb(0, 0, 0)
      })
    }

    // Add header to first page
    addQuestionHeader(questionPage)
    
    // Add questions
    let yPosition = 750
    orderedQuestions.forEach((q, index) => {
      if (yPosition < 100) {
        questionPage = questionPdf.addPage([595.28, 841.89])
        addQuestionHeader(questionPage)
        yPosition = 750
      }

      const sanitizedStem = sanitizeText(`${index + 1}. ${q.stem}`)
      questionPage.drawText(sanitizedStem.slice(0, 80), {
        x: 50, y: yPosition, size: 10, font: questionFont, color: rgb(0, 0, 0)
      })
      yPosition -= 20
      
      if (q.options && Array.isArray(q.options)) {
        q.options.forEach((option: string, optIndex: number) => {
          const optionLabel = String.fromCharCode(65 + optIndex) // A, B, C, D
          const optionText = sanitizeText(`${optionLabel}) ${option}`)
          questionPage.drawText(optionText.slice(0, 60), {
            x: 70, y: yPosition, size: 9, font: questionFont, color: rgb(0, 0, 0)
          })
          yPosition -= 15
        })
      }
      yPosition -= 10
    })
    
    const questionPdfBytes = await questionPdf.save()
    
    // Create OMR Sheet PDF
    const omrPdf = await PDFDocument.create()
    let omrPage = omrPdf.addPage([595.28, 841.89])
    const omrFont = await omrPdf.embedFont(StandardFonts.Helvetica)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addOmrHeader = (page: any) => {
      page.drawText(`OMR ANSWER SHEET`, {
        x: 200, y: 800, size: 16, font: omrFont, color: rgb(0, 0, 0)
      })
      page.drawText(`Test ID: ${test_id} | Version: ${version}`, {
        x: 50, y: 770, size: 12, font: omrFont, color: rgb(0, 0, 0)
      })
      page.drawText('Name: ____________________', {
        x: 50, y: 740, size: 10, font: omrFont, color: rgb(0, 0, 0)
      })
      page.drawText('Roll No: __________', {
        x: 350, y: 740, size: 10, font: omrFont, color: rgb(0, 0, 0)
      })
    }

    // Add header to first page
    addOmrHeader(omrPage)

    // Add answer bubbles grid
    let omrY = 700
    const questionsPerRow = 5
    const totalQuestions = orderedQuestions.length

    for (let i = 0; i < totalQuestions; i += questionsPerRow) {
      if (omrY < 80) {
        omrPage = omrPdf.addPage([595.28, 841.89])
        addOmrHeader(omrPage)
        omrY = 700
      }

      const endIndex = Math.min(i + questionsPerRow, totalQuestions)

      // Question numbers
      for (let j = i; j < endIndex; j++) {
        const x = 50 + (j - i) * 100
        omrPage.drawText(`${j + 1}`, { x, y: omrY, size: 8, font: omrFont, color: rgb(0, 0, 0) })

        // Draw option bubbles A, B, C, D
        ;['A', 'B', 'C', 'D'].forEach((option, optIndex) => {
          const bubbleX = x + optIndex * 15
          const bubbleY = omrY - 20
          omrPage.drawCircle({ x: bubbleX + 5, y: bubbleY, size: 4, borderColor: rgb(0, 0, 0) })
          omrPage.drawText(option, { x: bubbleX + 2, y: bubbleY - 8, size: 6, font: omrFont, color: rgb(0, 0, 0) })
        })
      }
      omrY -= 40
    }
    
    const omrPdfBytes = await omrPdf.save()
    
    // Upload PDFs to storage
    const { error: paperUploadError } = await supabase.storage
      .from('print-artifacts')
      .upload(paperPath, new Blob([questionPdfBytes], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (paperUploadError) {
      console.error('Failed to upload question paper:', paperUploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload question paper PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { error: omrUploadError } = await supabase.storage
      .from('print-artifacts')
      .upload(omrPath, new Blob([omrPdfBytes], { type: 'application/pdf' }), {
        contentType: 'application/pdf',
        upsert: true
      })
    
    if (omrUploadError) {
      console.error('Failed to upload OMR sheet:', omrUploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to upload OMR sheet PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Now create the print package record
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

    // Return the package info with actual PDF files now uploaded
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

  function generateLayoutHash(questions: { id: unknown }[]): string {
    const questionIds = questions.map(q => q.id).join(',')
    return btoa(questionIds).slice(0, 16)
  }

// Replace characters not supported by StandardFonts (WinAnsi) to avoid pdf-lib encoding errors
function sanitizeText(input: string): string {
  if (!input) return ''
  // Replace private-use area (e.g., FontAwesome glyphs) and non-printable/non-ASCII with '?'
  return String(input)
    .replace(/[\uE000-\uF8FF]/g, '?')
    .replace(/[^\x20-\x7E]/g, '?')
}

  async function generateQRCode(payload: Record<string, unknown>): Promise<string> {
  // Use a Deno-compatible QR code generation path (SVG string)
  const QRCode = await import('https://esm.sh/qrcode@1.5.3')
  try {
    const dataString = JSON.stringify(payload)
    const svgString = await QRCode.toString(dataString, {
      type: 'svg',
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    })
    const base64 = btoa(svgString)
    return `data:image/svg+xml;base64,${base64}`
  } catch (error) {
    console.error('QR code generation failed:', error)
    // Fallback simple SVG placeholder
    const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="180" height="180" fill="black"/>
      <rect x="20" y="20" width="160" height="160" fill="white"/>
      <text x="100" y="105" text-anchor="middle" fill="black" font-size="20">QR</text>
    </svg>`
    const base64 = btoa(svg)
    return `data:image/svg+xml;base64,${base64}`
  }
}
