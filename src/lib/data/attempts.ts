import { supabase } from '@/integrations/supabase/client'

export interface AttemptData {
  id: string
  test_id: string
  user_id: string
  started_at: string
  submitted_at?: string
  score?: number
  summary?: any
}

export interface AttemptDetail extends AttemptData {
  items: ItemAttempted[]
}

export interface ItemAttempted {
  id: number
  question_id: number
  selected_index: number
  correct: boolean
  time_ms: number
}

export async function getAttemptsByUser(userId: string, limit = 10): Promise<AttemptData[]> {
  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data ?? []
  } catch (error) {
    console.error('Error fetching attempts:', error)
    return []
  }
}

export async function getAttemptDetail(id: string): Promise<AttemptDetail | null> {
  try {
    const [attemptResult, itemsResult] = await Promise.all([
      supabase
        .from('attempts')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('items_attempted')
        .select('*')
        .eq('attempt_id', id)
    ])
    
    if (attemptResult.error) throw attemptResult.error
    if (itemsResult.error) throw itemsResult.error
    
    return {
      ...attemptResult.data,
      items: itemsResult.data ?? []
    }
  } catch (error) {
    console.error('Error fetching attempt detail:', error)
    return null
  }
}

export async function createAttempt(payload: {
  test_id: string
  user_id: string
}): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('attempts')
      .insert([payload])
      .select('id')
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating attempt:', error)
    return null
  }
}