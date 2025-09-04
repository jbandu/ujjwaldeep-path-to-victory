import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePremium() {
  const { data, isLoading, refetch } = useQuery<{ premium: boolean }>({
    queryKey: ['billing-status'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('billing-status');
        if (error) return { premium: false };
        return data;
      } catch (error) {
        return { premium: false };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true
  });

  return { isPremium: data?.premium ?? false, loading: isLoading, refetch };
}
