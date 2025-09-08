// Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Auth
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return json(401, { error: 'unauthorized' })

    // Payload
    const body = await req.json().catch(() => ({} as any))
    const testId: string | undefined = body?.testId
    const questionIds: number[] = Array.isArray(body?.question_ids) ? body.question_ids : []

    if (!testId) return json(400, { error: 'missing_testId' })
    if (!questionIds.length) return json(400, { error: 'empty_question_set' })

    // INSERT with default (return=minimal) — no reselect yet
    const { error: insErr } = await supabase
      .from('attempts')
      .insert([{ user_id: user.id, test_id: testId, summary: { question_ids: questionIds } }])

    if (insErr) {
      return json(403, { error: 'attempt_insert_denied', details: insErr.message })
    }

    // Fetch newest attempt id for this test/user
    const { data: rows, error: selErr } = await supabase
      .from('attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('test_id', testId)
      .order('started_at', { ascending: false })
      .limit(1)

    if (selErr) {
      return json(403, { error: 'attempt_select_denied', details: selErr.message })
    }

    const attemptId = rows?.[0]?.id
    if (!attemptId) return json(500, { error: 'attempt_id_not_found' })

    return json(200, { attempt: { id: attemptId }, question_ids: questionIds })
  } catch (e: any) {
    return json(500, { error: e?.message ?? 'unknown_error' })
  }
})
