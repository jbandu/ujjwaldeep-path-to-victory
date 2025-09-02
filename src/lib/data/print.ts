import { supabase } from '@/integrations/supabase/client'

export interface PrintPackage {
  id: string
  test_id: string
  version: number
  paper_pdf_url: string
  omr_pdf_url: string
  qr_payload: any
  created_by?: string
  created_at: string
}

export interface PrintUpload {
  id: string
  test_id: string
  user_id: string
  attempt_id?: string
  status: 'received' | 'processing' | 'graded' | 'error' | 'needs_review'
  upload_urls: string[]
  detected?: {
    answers: { q: number; sel: number; conf: number }[]
    warnings: string[]
    pages?: number
  }
  error?: string
  created_at: string
  updated_at?: string
}

export async function getPrintPackage(testId: string): Promise<PrintPackage | null> {
  try {
    const { data, error } = await supabase
      .from('print_packages')
      .select('*')
      .eq('test_id', testId)
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // No rows found
      throw error
    }
    return data as PrintPackage
  } catch (error) {
    console.error('Error fetching print package:', error)
    return null
  }
}

export async function createPrintPackage(payload: {
  test_id: string
  paper_pdf_url: string
  omr_pdf_url: string
  qr_payload: any
  version?: number
}): Promise<PrintPackage | null> {
  try {
    const { data, error } = await supabase
      .from('print_packages')
      .insert([{
        ...payload,
        version: payload.version || 1,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select('*')
      .single()
    
    if (error) throw error
    return data as PrintPackage
  } catch (error) {
    console.error('Error creating print package:', error)
    return null
  }
}

export async function createPrintUpload(payload: {
  test_id: string
  upload_urls: string[]
}): Promise<PrintUpload | null> {
  try {
    const user = await supabase.auth.getUser()
    if (!user.data.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('print_uploads')
      .insert([{
        ...payload,
        user_id: user.data.user.id
      }])
      .select('*')
      .single()
    
    if (error) throw error
    return data as PrintUpload
  } catch (error) {
    console.error('Error creating print upload:', error)
    return null
  }
}

export async function getPrintUploads(testId?: string, userId?: string, status?: string): Promise<PrintUpload[]> {
  try {
    let query = supabase
      .from('print_uploads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (testId) query = query.eq('test_id', testId)
    if (userId) query = query.eq('user_id', userId)
    if (status) query = query.eq('status', status)
    
    const { data, error } = await query
    if (error) throw error
    
    return (data ?? []) as PrintUpload[]
  } catch (error) {
    console.error('Error fetching print uploads:', error)
    return []
  }
}

export async function updatePrintUpload(
  id: string, 
  updates: Partial<Pick<PrintUpload, 'status' | 'detected' | 'error' | 'attempt_id'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('print_uploads')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating print upload:', error)
    return false
  }
}

export async function getPrintUpload(id: string): Promise<PrintUpload | null> {
  try {
    const { data, error } = await supabase
      .from('print_uploads')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as PrintUpload
  } catch (error) {
    console.error('Error fetching print upload:', error)
    return null
  }
}