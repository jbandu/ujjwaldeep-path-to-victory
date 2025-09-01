import { supabase } from '@/integrations/supabase/client'
import { shuffle } from '@/lib/utils/shuffle'
import { Question } from '@/types/questions'
import { 
  demoSubjects, 
  demoChapters, 
  demoQuestionIds, 
  demoQuestionsByIds 
} from '@/lib/data/demoQuestions'

export async function fetchSubjects(demoMode: boolean): Promise<string[]> {
  if (demoMode) return demoSubjects()
  
  const { data, error } = await supabase
    .from('questions')
    .select('subject')
    .eq('status', 'active')
  
  if (error) throw error
  
  const distinct = Array.from(new Set((data ?? []).map(d => d.subject).filter(Boolean)))
  return distinct.sort()
}

export async function fetchChapters(demoMode: boolean, subjects: string[]): Promise<string[]> {
  if (demoMode) return demoChapters(subjects)
  
  let query = supabase
    .from('questions')
    .select('chapter')
    .eq('status', 'active')
  
  if (subjects?.length) {
    query = query.in('subject', subjects)
  }
  
  const { data, error } = await query
  if (error) throw error
  
  const distinct = Array.from(new Set((data ?? []).map(d => d.chapter).filter(Boolean)))
  return distinct.sort()
}

export type QuestionFilters = {
  subjects?: string[]
  chapters?: string[]
  difficulty?: [number, number]
  limit: number
}

export async function fetchQuestionIds(demoMode: boolean, filters: QuestionFilters): Promise<number[]> {
  if (demoMode) return demoQuestionIds(filters)
  
  let query = supabase
    .from('questions')
    .select('id, difficulty, subject, chapter')
    .eq('status', 'active')
  
  if (filters.subjects?.length) {
    query = query.in('subject', filters.subjects)
  }
  
  if (filters.chapters?.length) {
    query = query.in('chapter', filters.chapters)
  }
  
  // Fetch more than needed, then filter and shuffle client-side
  const { data, error } = await query.limit(500)
  if (error) throw error
  
  let filteredData = data ?? []
  
  // Apply difficulty filter if specified
  if (filters.difficulty) {
    const [min, max] = filters.difficulty
    filteredData = filteredData.filter(q => {
      const diff = q.difficulty ?? 3
      return diff >= min && diff <= max
    })
  }
  
  // Shuffle and take limit
  const ids = shuffle(filteredData.map(r => r.id))
  return ids.slice(0, filters.limit)
}

export async function fetchQuestionsByIds(demoMode: boolean, ids: number[]): Promise<Question[]> {
  if (demoMode) return demoQuestionsByIds(ids)
  
  if (!ids.length) return []
  
  const { data, error } = await supabase
    .from('questions')
    .select('id, subject, chapter, topic, stem, options, correct_index, difficulty, explanation, language, source')
    .in('id', ids)
  
  if (error) throw error
  
  // Maintain the order of ids for the test
  const map = new Map((data ?? []).map(q => [q.id, q]))
  return ids.map(id => map.get(id)).filter(Boolean) as Question[]
}

export async function getAvailableQuestionCount(
  demoMode: boolean, 
  filters: Omit<QuestionFilters, 'limit'>
): Promise<number> {
  if (demoMode) {
    // Count demo questions matching filters
    const allIds = demoQuestionIds({ ...filters, limit: 1000 })
    return allIds.length
  }
  
  let query = supabase
    .from('questions')
    .select('id, difficulty', { count: 'exact' })
    .eq('status', 'active')
  
  if (filters.subjects?.length) {
    query = query.in('subject', filters.subjects)
  }
  
  if (filters.chapters?.length) {
    query = query.in('chapter', filters.chapters)
  }
  
  const { data, error, count } = await query
  if (error) throw error
  
  if (!filters.difficulty) {
    return count ?? 0
  }
  
  // Filter by difficulty client-side for now
  const [min, max] = filters.difficulty
  const filtered = (data ?? []).filter(q => {
    const diff = q.difficulty ?? 3
    return diff >= min && diff <= max
  })
  
  return filtered.length
}