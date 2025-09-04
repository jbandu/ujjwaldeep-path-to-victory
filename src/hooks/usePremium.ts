import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePremium() {
  const { data, isLoading } = useQuery<{ premium: boolean }>({
    queryKey: ['billing-status'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('billing-status');
        if (error) return { premium: false };
        return data;
      } catch (error) {
        return { premium: false };
      }
    }
  });

  return { isPremium: data?.premium ?? false, loading: isLoading };
}
