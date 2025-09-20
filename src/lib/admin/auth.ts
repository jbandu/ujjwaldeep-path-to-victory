import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export async function getCurrentUser(): Promise<{ user: User | null; error?: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return { user: null, error: error.message };
    }
    
    return { user };
  } catch (error) {
    console.error('Unexpected error getting user:', error);
    return { user: null, error: 'Unexpected error occurred' };
  }
}

export async function checkIsAdmin(userId: string): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    console.log('[checkIsAdmin] start', { userId });
    // First try the server-side helper which also considers service role/admin
    const { data: isAdminFlag, error: rpcError } = await supabase.rpc('is_admin');
    console.log('[checkIsAdmin] rpc result', { isAdminFlag, rpcError });
    if (!rpcError && typeof isAdminFlag === 'boolean') {
      return { isAdmin: isAdminFlag };
    }
    if (rpcError) {
      console.warn('is_admin RPC failed, falling back to profiles lookup:', rpcError);
    }

    // Fallback: read from profiles (RLS: user can read own row)
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle();
    console.log('[checkIsAdmin] profiles result', { data, error });
    
    if (error) {
      console.error('Error checking admin status via profiles:', error);
      return { isAdmin: false, error: error.message };
    }
    
    return { isAdmin: data?.is_admin === true };
  } catch (error) {
    console.error('Unexpected error checking admin status:', error);
    return { isAdmin: false, error: 'Unexpected error occurred' };
  }
}

export async function requireAdmin(): Promise<{ user: User; isAdmin: true } | { user: null; isAdmin: false; error: string }> {
  const { user, error: userError } = await getCurrentUser();
  
  if (!user || userError) {
    return { user: null, isAdmin: false, error: userError || 'Not authenticated' };
  }
  
  const { isAdmin, error: adminError } = await checkIsAdmin(user.id);
  
  if (!isAdmin || adminError) {
    return { user: null, isAdmin: false, error: adminError || 'Admin access required' };
  }
  
  return { user, isAdmin: true };
}