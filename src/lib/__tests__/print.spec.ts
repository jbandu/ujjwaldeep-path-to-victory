import { describe, it, expect, vi } from 'vitest'
import { getPrintPackage, createPrintUpload } from '../data/print'
import { supabase } from '@/integrations/supabase/client'

describe('print data helpers', () => {
  it('getPrintPackage returns latest package', async () => {
    const pkg = { id: 'p1', test_id: 't1', version: 2, paper_pdf_url: '', omr_pdf_url: '', qr_payload: {}, created_at: '' }
    const limit = vi.fn().mockResolvedValue({ data: [pkg], error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    const fromMock = vi.spyOn(supabase, 'from').mockReturnValue({ select } as any)

    const result = await getPrintPackage('t1')
    expect(result).toEqual(pkg)

    fromMock.mockRestore()
  })

  it('createPrintUpload returns null when unauthenticated', async () => {
    const getUser = vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null } } as any)

    const result = await createPrintUpload({ test_id: 't1', upload_urls: ['u1'] })
    expect(result).toBeNull()

    getUser.mockRestore()
  })

  it('createPrintUpload inserts with current user id', async () => {
    const getUser = vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'u1' } } } as any)
    const single = vi.fn().mockResolvedValue({ data: { id: 'id1', test_id: 't1', user_id: 'u1', upload_urls: ['u1'], status: 'received', created_at: '' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const fromMock = vi.spyOn(supabase, 'from').mockReturnValue({ insert } as any)

    const result = await createPrintUpload({ test_id: 't1', upload_urls: ['u1'] })
    expect(result?.user_id).toBe('u1')
    expect(insert).toHaveBeenCalledWith([{ test_id: 't1', upload_urls: ['u1'], user_id: 'u1' }])

    getUser.mockRestore()
    fromMock.mockRestore()
  })
})

