import { describe, it, expect, vi } from 'vitest'
import { getAttemptDetail, createAttempt } from '../data/attempts'
import { supabase } from '@/integrations/supabase/client'

describe('attempt data helpers', () => {
  it('getAttemptDetail combines attempt and items', async () => {
    const attempt = { id: '1', test_id: 't', user_id: 'u', started_at: 'now' }
    const items = [
      { id: 1, question_id: 1, selected_index: 2, correct: true, time_ms: 500 },
    ]

    const fromMock = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'attempts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: attempt, error: null }),
            }),
          }),
        } as any
      }
      if (table === 'items_attempted') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: items, error: null }),
          }),
        } as any
      }
      throw new Error('unexpected table ' + table)
    })

    const result = await getAttemptDetail('1')
    expect(result).toEqual({ ...attempt, items })

    fromMock.mockRestore()
  })

  it('createAttempt returns id on success', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: '123' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const fromMock = vi.spyOn(supabase, 'from').mockReturnValue({ insert } as any)

    const result = await createAttempt({ test_id: 't', user_id: 'u' })
    expect(result).toEqual({ id: '123' })
    expect(insert).toHaveBeenCalledWith([{ test_id: 't', user_id: 'u' }])

    fromMock.mockRestore()
  })
})

