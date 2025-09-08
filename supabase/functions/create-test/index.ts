// supabase/functions/create-test/index.ts
// Deno runtime — Edge Function
// Creates a test row owned by the authenticated user.
//
// Requires RLS on `public.tests` that allows inserts when owner_id = auth.uid().
// Example policy:
//   CREATE POLICY "insert own test"
//   ON public.tests FOR INSERT
//   TO authenticated
//   WITH CHECK (owner_id = auth.uid());

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

// CORS helpers ---------------------------------------------------------------
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*', // or set to specific origins if you prefer
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
}

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...extraHeaders,
    },
  })
}

// Types & validation ---------------------------------------------------------
type Visibility = 'private' | 'shared' | 'school'
type Mode = 'custom' | 'chapter' | 'difficulty_mix' | 'pyp'

const ALLOWED_VIS: Visibility[] = ['private', 'shared', 'school']
const ALLOWED_MODE: Mode[] = ['custom', 'chapter', 'difficulty_mix', 'pyp']

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function safeInt(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Simple ping (useful for connectivity/CORS checks)
  if (req.method === 'GET') {
    return json({ ok: true, function: 'create-test' })
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  try {
    // Forward caller’s JWT so RLS sees the real user
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'missing_bearer_token' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) {
      return json({ error: 'server_misconfigured', details: 'Missing SUPABASE_URL / SUPABASE_ANON_KEY' }, 500)
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Identify user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    // Parse & validate body
    const raw = await req.json().catch(() => ({} as any))

    const mode: Mode = ALLOWED_MODE.includes(raw?.mode) ? raw.mode : 'custom'
    const duration_sec = clamp(safeInt(raw?.duration_sec, 3600), 60, 6 * 60 * 60) // 1m..6h
    const visibility: Visibility = ALLOWED_VIS.includes(raw?.visibility)
      ? raw.visibility
      : 'private'

    // `config` can be any JSON object; ensure it's an object
    const config =
      raw?.config && typeof raw.config === 'object' && !Array.isArray(raw.config)
        ? raw.config
        : { questions: [] }

    const total_marks =
      raw?.total_marks === null || raw?.total_marks === undefined
        ? null
        : safeInt(raw.total_marks, null as unknown as number)

    // Insert
    const { data, error } = await supabase
      .from('tests')
      .insert([
        {
          owner_id: user.id,
          mode,
          config,
          duration_sec,
          visibility,
          total_marks,
        },
      ])
      .select('id, owner_id, mode, duration_sec, visibility, total_marks, created_at')
      .single()

    if (error) {
      // Most common here: RLS blocks insert if policy doesn’t allow owner_id = auth.uid()
      return json(
        {
          error: 'insert_failed',
          details: error.message,
          hint:
            'Check RLS policy on public.tests to allow inserts where owner_id = auth.uid().',
        },
        400
      )
    }

    return json({ test: data }, 200)
  } catch (e: any) {
    console.error('create-test error:', e)
    return json(
      { error: 'internal_error', details: e?.message ?? String(e) },
      500
    )
  }
})