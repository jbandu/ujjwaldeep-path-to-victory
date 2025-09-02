import { supabase } from '@/integrations/supabase/client'

export interface AITask {
  id: string
  task_type: string
  question_id?: number
  locale?: string
  payload?: any
  status: string
  result?: any
  error?: string
  created_by?: string
  created_at: string
  updated_at?: string
}

export async function getAITasks({
  status,
  questionId,
  limit = 50
}: {
  status?: string
  questionId?: number
  limit?: number
}): Promise<AITask[]> {
  try {
    let query = supabase
      .from('ai_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (status) {
      query = query.eq('status', status as any)
    }
    
    if (questionId) {
      query = query.eq('question_id', questionId)
    }
    
    const { data, error } = await query
    if (error) throw error
    
    return data ?? []
  } catch (error) {
    console.error('Error fetching AI tasks:', error)
    return []
  }
}

export async function enqueueAITask({
  task_type,
  question_id,
  locale,
  payload = {}
}: {
  task_type: string
  question_id: number
  locale?: string
  payload?: any
}): Promise<string | null> {
  try {
    const { data, error } = await (supabase as any).rpc('ai_enqueue', {
      p_task_type: task_type,
      p_question_id: question_id,
      p_locale: locale,
      p_payload: payload
    })
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error enqueuing AI task:', error)
    return null
  }
}

export async function applyAIResult({
  task_id,
  result
}: {
  task_id: string
  result: any
}): Promise<boolean> {
  try {
    const { error } = await (supabase as any).rpc('ai_apply_result', {
      p_task_id: task_id,
      p_result: result
    })
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error applying AI result:', error)
    return false
  }
}

export async function getDistinctSubjects(): Promise<string[]> {
  try {
    const { data, error } = await (supabase as any).rpc('get_distinct_subjects')
    if (error) throw error
    
    return (data ?? []).map(row => row.subject).sort()
  } catch (error) {
    console.error('Error fetching distinct subjects:', error)
    return []
  }
}

export async function getDistinctChapters(subjects?: string[]): Promise<string[]> {
  try {
    const { data, error } = await (supabase as any).rpc('get_distinct_chapters', {
      subjects: subjects?.length ? subjects : null
    })
    if (error) throw error
    
    return (data ?? []).map(row => row.chapter).sort()
  } catch (error) {
    console.error('Error fetching distinct chapters:', error)
    return []
  }
}