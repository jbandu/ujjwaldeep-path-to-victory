import { supabase } from '@/integrations/supabase/client'

export interface GamificationData {
  user_id: string
  points: number
  streak_days: number
  badges: string[]
  last_active_date?: string
}

export async function getGamification(userId: string): Promise<GamificationData | null> {
  try {
    const { data, error } = await supabase
      .from('gamification')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Return default values if no record exists
    if (!data) {
      return {
        user_id: userId,
        points: 0,
        streak_days: 0,
        badges: []
      }
    }
    
    return data
  } catch (error) {
    console.error('Error fetching gamification data:', error)
    return {
      user_id: userId,
      points: 0,
      streak_days: 0,
      badges: []
    }
  }
}

export async function updateGamification(
  userId: string,
  updates: Partial<Omit<GamificationData, 'user_id'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gamification')
      .upsert([{ user_id: userId, ...updates }])
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating gamification data:', error)
    return false
  }
}