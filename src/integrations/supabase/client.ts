// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = 'https://orxjqiegmocarwdedkpu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGpxaWVnbW9jYXJ3ZGVka3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTMyNTAsImV4cCI6MjA3MjMyOTI1MH0.f4iuMUTCcE_scPlQxafiJ1LnjPU1lTYAD6-z0ifdhAY'

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})

