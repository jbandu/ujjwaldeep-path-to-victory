import { supabase } from '@/integrations/supabase/client';

export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { session: null, error };
    }
    
    return { session, error: null };
  } catch (error) {
    console.error('Unexpected error getting session:', error);
    return { session: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return { user: null, error };
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('Unexpected error getting user:', error);
    return { user: null, error };
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error getting user profile:', error);
      return { profile: null, error };
    }
    
    return { profile: data, error: null };
  } catch (error) {
    console.error('Unexpected error getting user profile:', error);
    return { profile: null, error };
  }
};