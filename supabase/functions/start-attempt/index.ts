// Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type BuilderConfig = {
  subjects?: string[]
  chapters?: string[]
  difficulty?: [number] | [number, number]
  questionCount?: number
  questions?: number[]
  [k: string]: unknown
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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
    if (!testId) return json(400, { error: 'missing_testId' })

    // Fetch test
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, owner_id, config, visibility, duration_sec, total_marks')
      .eq('id', testId)
      .maybeSingle()

    if (testErr) return json(400, { error: 'load_test_failed', details: testErr.message })
    if (!test) return json(404, { error: 'test_not_found' })

    const cfg = (test.config ?? {}) as BuilderConfig

    let questionIds: number[] = []
    if (Array.isArray(cfg.questions) && cfg.questions.length > 0) {
      questionIds = cfg.questions.map(Number).filter(Number.isFinite)
    } else {
      const subjects = Array.isArray(cfg.subjects) ? cfg.subjects : []
      const chapters = Array.isArray(cfg.chapters) ? cfg.chapters : []
      const diffArr = Array.isArray(cfg.difficulty) ? cfg.difficulty : [3]
      const minDiff = Number(diffArr[0] ?? 3)
      const maxDiff = Number((diffArr as any)[1] ?? minDiff)
      const want = Math.max(1, Math.min(Number(cfg.questionCount ?? 25), 200))

      if (subjects.length === 0) {
        return json(400, { error: 'no_subjects_selected' })
      }

      // Candidate questions
      let q = supabase
        .from('questions')
        .select('id', { head: false })
        .eq('status', 'active')
        .in('subject', subjects)
        .gte('difficulty', minDiff)
        .lte('difficulty', maxDiff)
        .limit(Math.min(want * 5, 1000))

      if (chapters.length > 0) q = q.in('chapter', chapters)

      const { data: candidates, error: qErr } = await q
      if (qErr) return json(400, { error: 'load_questions_failed', details: qErr.message })
      if (!candidates || candidates.length === 0) {
        return json(400, { error: 'no_questions_match_filters' })
      }

      questionIds = shuffle(candidates.map((c) => c.id)).slice(0, want)
    }

    if (questionIds.length === 0) return json(400, { error: 'empty_question_set' })

    // Insert attempt (RLS must allow this)
    const { data: attempt, error: aErr } = await supabase
      .from('attempts')
      .insert([
        {
          user_id: user.id,
          test_id: test.id,
          summary: { question_ids: questionIds, config_used: cfg },
        },
      ])
      .select('id')
      .single()

    if (aErr) {
      return json(403, { error: 'attempt_rls_denied', details: aErr.message })
    }

    return json(200, { attempt: { id: attempt.id }, question_ids: questionIds })
  } catch (e: any) {
    return json(500, { error: e?.message ?? 'unknown_error' })
  }
})
