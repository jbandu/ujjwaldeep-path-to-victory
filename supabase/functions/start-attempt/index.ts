// functions/start-attempt/index.ts
// Deno Deploy runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' }})
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // user-scoped client (enforces RLS with user's JWT)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // admin client (bypasses RLS for reads)
    const adminClient = createClient(SUPABASE_URL, SERVICE, {
      auth: { persistSession: false },
    })

    // 1) Verify user
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    // 2) Read payload
    const body = await req.json().catch(() => ({}))
    const testId: string | undefined = body?.testId
    if (!testId) {
      return new Response(JSON.stringify({ error: 'missing_testId' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    // 3) Load test (user-scoped; RLS applies)
    const { data: test, error: testErr } = await userClient
      .from('tests')
      .select('id, owner_id, duration_sec, config')
      .eq('id', testId)
      .maybeSingle()

    if (testErr || !test) {
      return new Response(JSON.stringify({ error: 'test_not_found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    // 4) Derive question filters from test.config (adjust to your schema)
    const cfg = test.config ?? {}
    const subjects = Array.isArray(cfg.subjects) && cfg.subjects.length ? cfg.subjects : ['PHYSICS', 'CHEMISTRY', 'BIOLOGY']
    const chapters = Array.isArray(cfg.chapters) && cfg.chapters.length ? cfg.chapters : null
    const difficulty = Array.isArray(cfg.difficulty) && cfg.difficulty.length ? Number(cfg.difficulty[0]) : null
    const questionCount = Number(cfg.questionCount ?? 25)

    // normalize to uppercase if your data uses UPPER() check
    const subjectsUpper = subjects.map((s: string) => s.toUpperCase())

    // 5) Fetch questions with SERVICE ROLE (bypass RLS)
    let q = adminClient
      .from('questions')
      .select('id, subject, chapter, stem, options, correct_index, difficulty')
      .eq('status', 'active')
      .in('subject', subjectsUpper)
      .limit(questionCount)

    if (chapters) q = q.in('chapter', chapters)
    if (difficulty) q = q.eq('difficulty', difficulty)

    const { data: questions, error: qErr } = await q
    if (qErr) {
      return new Response(JSON.stringify({ error: 'question_fetch_failed', details: qErr.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    // 6) Create attempt with USER client (RLS enforces user_id)
    const { data: attempt, error: aErr } = await userClient
      .from('attempts')
      .insert({ user_id: user.id, test_id: test.id })
      .select('id')
      .single()

    if (aErr || !attempt) {
      return new Response(JSON.stringify({ error: 'attempt_create_failed', details: aErr?.message }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    // 7) Optionally pre-seed items_attempted here, or return questions to client
    return new Response(JSON.stringify({ attempt, questions }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'unknown_error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' }})
  }
})