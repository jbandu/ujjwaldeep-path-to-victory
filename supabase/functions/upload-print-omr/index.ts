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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    const formData = await req.formData()
    const testId = formData.get('test_id') as string
    const files = formData.getAll('files') as File[]

    if (!testId) {
      return new Response(
        JSON.stringify({ error: 'test_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!files.length) {
      return new Response(
        JSON.stringify({ error: 'At least one file is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: `Invalid file type: ${file.type}. Allowed: PDF, JPG, PNG` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024 // 10MB
    for (const file of files) {
      if (file.size > maxSize) {
        return new Response(
          JSON.stringify({ error: `File too large: ${file.name}. Max size: 10MB` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify test exists and user can access it
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, visibility, owner_id')
      .eq('id', testId)
      .single()

    if (testError || !test) {
      return new Response(
        JSON.stringify({ error: 'Test not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user can access this test
    const canAccess = test.visibility === 'shared' || 
                     test.visibility === 'school' || 
                     test.owner_id === user.id

    if (!canAccess) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to submit answers for this test' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate upload ID and paths
    const uploadId = crypto.randomUUID()
    const uploadPaths: string[] = []

    // Upload files to storage
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileName = `${testId}/${user.id}/${uploadId}/page-${i + 1}.${getFileExtension(file.name)}`
      
      const { error: uploadError } = await supabase.storage
        .from('print-uploads')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        console.error('File upload error:', uploadError)
        return new Response(
          JSON.stringify({ error: `Failed to upload ${file.name}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      uploadPaths.push(fileName)
    }

    // Create print upload record
    const { data: upload, error: insertError } = await supabase
      .from('print_uploads')
      .insert({
        id: uploadId,
        test_id: testId,
        user_id: user.id,
        upload_urls: uploadPaths,
        status: 'received'
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('Failed to create upload record:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create upload record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Trigger background processing without blocking response
    const processUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-print-omr`
    const adminToken = Deno.env.get('ADMIN_TASK_TOKEN') ?? ''

    Promise.allSettled([
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken
        },
        body: JSON.stringify({ upload_id: uploadId })
      })
    ]).then(async ([result]) => {
      if (result.status === 'rejected' || !result.value.ok) {
        const errorText =
          result.status === 'rejected'
            ? result.reason?.message ?? 'Unknown error'
            : await result.value.text()
        console.error('Failed to trigger processing:', errorText)

        await supabase
          .from('print_uploads')
          .update({ status: 'error', error: 'processing trigger failed' })
          .eq('id', uploadId)
      }
    })

    return new Response(
      JSON.stringify({
        upload_id: uploadId,
        status: 'received',
        files_uploaded: uploadPaths.length,
        message: 'Files uploaded successfully. Processing will begin shortly.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in upload-print-omr:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : 'unknown'
}