// Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // include headers supabase-js sends so CORS never blocks
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type BuilderConfig = {
  subjects?: string[]
  chapters?: string[]
  difficulty?: [number] | [number, number]
  questionCount?: number
  // tolerate other fields
  [k: string]: unknown
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } } // forward user JWT → RLS applies
    )

    // auth
    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const user = userRes.user

    // payload
    const body = await req.json().catch(() => ({} as any))
    const testId: string | undefined = body?.testId
    if (!testId) {
      return new Response(JSON.stringify({ error: 'missing_testId' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // load test (RLS should allow owner/shared; see SQL below)
    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, owner_id, config, visibility, duration_sec, total_marks')
      .eq('id', testId)
      .maybeSingle()

    if (testErr) {
      return new Response(JSON.stringify({ error: testErr.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!test) {
      return new Response(JSON.stringify({ error: 'test_not_found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // derive filters
    const cfg = (test.config ?? {}) as BuilderConfig
    // if test.config already contains a concrete questions list, honor it
    const preselected = Array.isArray((cfg as any).questions)
      ? ((cfg as any).questions as number[])
      : []

    let questionIds: number[] = []

    if (preselected.length > 0) {
      questionIds = preselected.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    } else {
      // builder-style config → subjects/chapters/difficulty/questionCount
      const subjects = Array.isArray(cfg.subjects) ? cfg.subjects : []
      const chapters = Array.isArray(cfg.chapters) ? cfg.chapters : []
      const diffArr = Array.isArray(cfg.difficulty) ? cfg.difficulty : [3]
      const minDiff = Number(diffArr[0] ?? 3)
      const maxDiff = Number((diffArr as any)[1] ?? minDiff)
      const want = Math.max(1, Math.min(Number(cfg.questionCount ?? 25), 200))

      if (subjects.length === 0) {
        return new Response(JSON.stringify({ error: 'no_subjects_selected' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      // fetch candidate questions (limit generously then sample client-side)
      let q = supabase
        .from('questions')
        .select('id', { count: 'exact', head: false })
        .eq('status', 'active')
        .in('subject', subjects)
        .gte('difficulty', minDiff)
        .lte('difficulty', maxDiff)
        .limit(Math.min(want * 5, 1000))

      if (chapters.length > 0) {
        q = q.in('chapter', chapters)
      }

      const { data: candidates, error: qErr } = await q
      if (qErr) {
        return new Response(JSON.stringify({ error: qErr.message }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      if (!candidates || candidates.length === 0) {
        return new Response(
          JSON.stringify({ error: 'no_questions_match_filters' }),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        )
      }

      const sampled = shuffle(candidates.map((c) => c.id)).slice(0, want)
      questionIds = sampled
    }

    if (questionIds.length === 0) {
      return new Response(JSON.stringify({ error: 'empty_question_set' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // create attempt
    const { data: attempt, error: aErr } = await supabase
      .from('attempts')
      .insert([
        {
          user_id: user.id,
          test_id: test.id,
          // keep details in summary for the player
          summary: {
            question_ids: questionIds,
            // capture what we actually used
            config_used: {
              subjects: (cfg.subjects ?? []),
              chapters: (cfg.chapters ?? []),
              difficulty: (cfg.difficulty ?? [3]),
            },
          },
        },
      ])
      .select('id')
      .single()

    if (aErr) {
      return new Response(JSON.stringify({ error: aErr.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ attempt: { id: attempt.id }, question_ids: questionIds }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'unknown_error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
