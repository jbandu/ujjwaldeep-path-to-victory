import { supabase } from '@/integrations/supabase/client'

export interface TestData {
  id: string
  config: any
  duration_sec: number
  mode: string
  total_marks?: number
  created_at: string
  visibility: string
}

export async function getTestsByUser(userId: string, limit = 10): Promise<TestData[]> {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('id, config, duration_sec, mode, total_marks, created_at, visibility')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data ?? []
  } catch (error) {
    console.error('Error fetching tests:', error)
    return []
  }
}

export async function createTest(payload: {
  config: any
  duration_sec: number
  mode: string
  total_marks?: number
  visibility?: string
  owner_id: string
}): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tests')
      .insert([payload])
      .select('id')
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating test:', error)
    return null
  }
}

export async function getTest(id: string): Promise<TestData | null> {
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching test:', error)
    return null
  }
}