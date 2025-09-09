import { supabase } from '@/integrations/supabase/client';

/**
 * Server-side utility to ensure a profile row exists for a user
 * This should be called from server-side code with service role permissions
 */
export async function ensureProfileRow(userId: string, fullName?: string, email?: string) {
  try {
    // Use upsert to create or update the profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        full_name: fullName || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to ensure profile row:', error);
      return { profile: null, error };
    }

    return { profile: data, error: null };
  } catch (error) {
    console.error('Unexpected error ensuring profile row:', error);
    return { profile: null, error };
  }
}

/**
 * Client-side safe profile fetcher with graceful error handling
 * Returns null if profile doesn't exist instead of throwing
 */
export async function fetchUserProfileSafe(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // If no row found (not an error), return null
    if (!data && !error) {
      return { profile: null, error: null, needsOnboarding: true };
    }

    // If there's an actual error
    if (error) {
      console.error('Error fetching user profile:', error);
      return { profile: null, error, needsOnboarding: false };
    }

    return { profile: data, error: null, needsOnboarding: false };
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return { profile: null, error, needsOnboarding: false };
  }
}

/**
 * Check if the current user has a complete profile
 */
export async function checkProfileCompleteness(userId: string) {
  const { profile, error } = await fetchUserProfileSafe(userId);
  
  if (error || !profile) {
    return { isComplete: false, missingFields: ['all'], profile: null };
  }

  const requiredFields = ['full_name', 'board', 'medium', 'class_level'];
  const missingFields = requiredFields.filter(field => !profile[field]);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    profile
  };
}