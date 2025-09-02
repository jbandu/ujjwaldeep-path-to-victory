import { supabase } from '@/integrations/supabase/client'
import { shuffle } from '@/lib/utils/shuffle'
import { Question } from '@/types/questions'
import { isDemoEnabled } from '@/hooks/useDemoMode'
import { 
  demoSubjects, 
  demoChapters, 
  demoQuestionIds, 
  demoQuestionsByIds 
} from '@/lib/data/demoQuestions'

export type QuestionFilters = {
  subjects?: string[]
  chapters?: string[]
  difficulty?: [number, number]
  limit: number
}

export async function fetchSubjects(): Promise<string[]> {
  try {
    const { data, error } = await (supabase as any).rpc('get_distinct_subjects')
    if (error) throw error
    
    const subjects = (data ?? []).map(row => row.subject).sort()
    
    // Fallback to demo data only if no real data and demo mode is enabled
    if (subjects.length === 0 && isDemoEnabled()) {
      return demoSubjects()
    }
    
    return subjects
  } catch (error) {
    console.error('Error fetching subjects:', error)
    if (isDemoEnabled()) {
      return demoSubjects()
    }
    return []
  }
}

export async function fetchChapters(subjects: string[]): Promise<string[]> {
  try {
    const { data, error } = await (supabase as any).rpc('get_distinct_chapters', {
      subjects: subjects?.length ? subjects : null
    })
    if (error) throw error
    
    const chapters = (data ?? []).map(row => row.chapter).sort()
    
    // Fallback to demo data only if no real data and demo mode is enabled
    if (chapters.length === 0 && isDemoEnabled()) {
      return demoChapters(subjects)
    }
    
    return chapters
  } catch (error) {
    console.error('Error fetching chapters:', error)
    if (isDemoEnabled()) {
      return demoChapters(subjects)
    }
    return []
  }
}

export async function fetchQuestionIds(filters: QuestionFilters): Promise<number[]> {
  try {
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
    const result = ids.slice(0, filters.limit)
    
    // Fallback to demo data only if no real data and demo mode is enabled
    if (result.length === 0 && isDemoEnabled()) {
      return demoQuestionIds(filters)
    }
    
    return result
  } catch (error) {
    console.error('Error fetching question IDs:', error)
    if (isDemoEnabled()) {
      return demoQuestionIds(filters)
    }
    return []
  }
}

export async function fetchQuestionsByIds(ids: number[]): Promise<Question[]> {
  if (!ids.length) return []
  
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('id, subject, chapter, topic, stem, options, correct_index, difficulty, explanation, language, source')
      .in('id', ids)
    
    if (error) throw error
    
    // Maintain the order of ids for the test
    const map = new Map((data ?? []).map(q => [q.id, q]))
    const result = ids.map(id => map.get(id)).filter(Boolean) as Question[]
    
    // Fallback to demo data only if no real data and demo mode is enabled
    if (result.length === 0 && isDemoEnabled()) {
      return demoQuestionsByIds(ids)
    }
    
    return result
  } catch (error) {
    console.error('Error fetching questions by IDs:', error)
    if (isDemoEnabled()) {
      return demoQuestionsByIds(ids)
    }
    return []
  }
}

export async function getAvailableQuestionCount(
  filters: Omit<QuestionFilters, 'limit'>
): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_available_question_count', {
      subjects: filters.subjects?.length ? filters.subjects : null,
      chapters: filters.chapters?.length ? filters.chapters : null,
      min_diff: filters.difficulty?.[0] || null,
      max_diff: filters.difficulty?.[1] || null
    })
    
    if (error) throw error
    const count = data ?? 0
    
    // Fallback to demo data only if no real data and demo mode is enabled
    if (count === 0 && isDemoEnabled()) {
      const allIds = demoQuestionIds({ ...filters, limit: 1000 })
      return allIds.length
    }
    
    return count
  } catch (error) {
    console.error('Error getting available question count:', error)
    if (isDemoEnabled()) {
      const allIds = demoQuestionIds({ ...filters, limit: 1000 })
      return allIds.length
    }
    return 0
  }
}