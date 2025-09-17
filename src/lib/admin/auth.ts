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
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin status:', error);
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