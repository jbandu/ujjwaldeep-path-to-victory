import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export function usePremium() {
  const session = useSession();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['billing-status', session?.user?.id],
    enabled: !!session,
    queryFn: async (): Promise<{ premium: boolean }> => {
      // For now, return premium: true for all users to allow full access
      return { premium: true };
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000 * 60, // Cache for 1 minute (renamed from cacheTime in v5)
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  return { isPremium: data?.premium ?? true, loading: isLoading, refetch };
}
