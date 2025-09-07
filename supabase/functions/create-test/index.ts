// Deno Deploy runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } } // <-- forward JWT
    )

    // Who is calling?
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    const payload = await req.json().catch(() => ({} as any))
    // Minimal validation + safe defaults
    const mode = payload.mode ?? 'custom'
    const duration_sec = Number(payload.duration_sec ?? 3600)
    const visibility = payload.visibility ?? 'private'
    const config = payload.config ?? { questions: [] }
    const total_marks = payload.total_marks ?? null

    // Insert with owner_id enforced server-side (RLS will re-check)
    const { data, error } = await supabase
      .from('tests')
      .insert([{
        owner_id: user.id,
        mode,
        config,
        duration_sec,
        visibility,
        total_marks,
      }])
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message, details: error.details }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' }})
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' }})
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'unknown_error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' }})
  }
})