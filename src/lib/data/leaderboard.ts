import { supabase } from '@/integrations/supabase/client'

export interface LeaderboardEntry {
  rank: number
  points: number
  display_name?: string
  day?: string
}

export async function getDailyLeaderboard({
  from,
  to,
  limit = 20
}: {
  from?: string
  to?: string
  limit?: number
}): Promise<LeaderboardEntry[]> {
  try {
    // Use the leaderboard function instead of direct table access
    const { data, error } = await supabase.functions.invoke('leaderboard-daily', {
      body: { limit }
    })
    
    if (error) throw error
    return data ?? []
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error)
    return []
  }
}

export async function getWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // TODO: Implement weekly leaderboard when available
  try {
    // For now, return empty array - this would need a weekly aggregation
    return []
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error)
    return []
  }
}

export async function getMonthlyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  // TODO: Implement monthly leaderboard when available
  try {
    // For now, return empty array - this would need a monthly aggregation
    return []
  } catch (error) {
    console.error('Error fetching monthly leaderboard:', error)
    return []
  }
}