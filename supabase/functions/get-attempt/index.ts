import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (status: number, body: any) =>
  new Response(JSON.stringify(body), { 
    status, 
    headers: { ...cors, 'Content-Type': 'application/json' } 
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return json(401, { error: 'unauthorized' })
    }

    // Support both GET path params and POST body
    const url = new URL(req.url)
    const pathId = url.pathname.match(/\/get-attempt\/([0-9a-f-]{36})$/i)?.[1]
    const body = req.method === 'POST' ? (await req.json().catch(() => ({}))) : {}
    const attemptId: string | undefined = body.attemptId || pathId
    
    if (!attemptId) {
      return json(400, { error: 'missing_attempt_id' })
    }

    console.log('Getting attempt:', attemptId, 'for user:', user.id)

    // Load attempt (must belong to user)
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id, test_id, started_at, submitted_at, summary')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (attemptError) {
      console.error('Attempt fetch error:', attemptError)
      return json(403, { error: 'attempt_select_denied', details: attemptError.message })
    }
    if (!attempt) {
      return json(404, { error: 'attempt_not_found' })
    }

    // Check if already submitted
    if (attempt.submitted_at) {
      return json(400, { error: 'Attempt already submitted', redirectTo: `/app/results/${attemptId}` })
    }

    // Get test data for duration
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('duration_sec, config')
      .eq('id', attempt.test_id)
      .maybeSingle()

    if (testError || !test) {
      console.error('Test fetch error:', testError)
      return json(404, { error: 'test_not_found' })
    }

    // Determine question ids from attempt summary or derive from test config
    let qids: number[] = Array.isArray(attempt.summary?.question_ids) ? attempt.summary.question_ids : []

    if (!qids.length && attempt.test_id) {
      // Fallback: derive from test.config (same logic as start-attempt)
      const cfg = test.config ?? {}
      const subjects: string[] = cfg.subjects ?? []
      const chapters: string[] = cfg.chapters ?? []
      const difficulty: number = cfg.difficulty?.[0] ?? 3
      const questionCount: number = cfg.questionCount ?? 25

      let q = supabase
        .from('questions')
        .select('id')
        .eq('status', 'active')
        .in('subject', subjects.length ? subjects : ['Physics','Chemistry','Biology'])
        .gte('difficulty', difficulty)
        .limit(questionCount)

      if (chapters.length) q = q.in('chapter', chapters)
      const { data: qs } = await q
      qids = (qs ?? []).map(r => r.id as number)
    }

    if (qids.length === 0) {
      return json(400, { error: 'empty_question_set' })
    }

    // Fetch user profile for language preference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.warn('Profile fetch error (continuing with English):', profileError)
    }

    const userLangName = (profile?.language || 'English').trim()
    const langMap: Record<string, string> = { English: 'en', Hindi: 'hi', Telugu: 'te', Tamil: 'ta' }
    const userLangCode = langMap[userLangName] || 'en'

    // Get questions (without correct answers for security)
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, subject, chapter, stem, options, difficulty')
      .in('id', qids)
      .eq('status', 'active')

    if (questionsError) {
      console.error('Questions fetch error:', questionsError)
      return json(403, { error: 'questions_select_denied', details: questionsError.message })
    }

    // Apply localization if available and preferred language is not English
    let localizedMap = new Map<number, any>()
    if (userLangCode !== 'en') {
      const { data: locs, error: locsError } = await supabase
        .from('question_localizations')
        .select('question_id, stem, options, explanation')
        .in('question_id', questionIds)
        .eq('language', userLangCode)

      if (locsError) {
        console.warn('Localization fetch error (continuing without localization):', locsError)
      } else if (locs && locs.length > 0) {
        localizedMap = new Map(locs.map((l: any) => [l.question_id, l]))
      }
    }

    // Get existing responses
    const { data: responses, error: responsesError } = await supabase
      .from('items_attempted')
      .select('question_id, selected_index')
      .eq('attempt_id', attemptId)

    if (responsesError) {
      console.error('Responses fetch error:', responsesError)
      // Don't fail here, just continue without existing responses
    }

    // Create a map of existing responses
    const responseMap = new Map(responses?.map(r => [r.question_id, r.selected_index]) || [])

    // Sort questions according to the original order and merge localizations
    const sortedQuestions = qids
      .map((id: number) => questions?.find(q => q.id === id))
      .filter(Boolean)
      .map((q: any) => {
        const loc = localizedMap.get(q.id)
        return loc
          ? { ...q, stem: loc.stem ?? q.stem, options: loc.options ?? q.options }
          : q
      })

    console.log(`Found ${sortedQuestions.length} questions for attempt. Language preference: ${userLangName} (${userLangCode})`)

    // Calculate time remaining
    const startTime = new Date(attempt.started_at).getTime()
    const currentTime = Date.now()
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
    const timeRemaining = Math.max(0, test.duration_sec - elapsedSeconds)

    return json(200, { 
      id: attempt.id,
      test_id: attempt.test_id,
      started_at: attempt.started_at,
      duration_sec: test.duration_sec,
      time_remaining: timeRemaining,
      questions: sortedQuestions,
      total_questions: sortedQuestions.length,
      existing_responses: Object.fromEntries(responseMap)
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return json(500, { error: 'internal_server_error', details: error.message })
  }
})