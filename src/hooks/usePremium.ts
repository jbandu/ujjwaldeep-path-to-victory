import { useQuery } from '@tanstack/react-query';

export function usePremium() {
  const { data, isLoading } = useQuery<{ premium: boolean }>({
    queryKey: ['billing-status'],
    queryFn: async () => {
      const res = await fetch('/api/billing/status');
      if (!res.ok) return { premium: false };
      return res.json();
    }
  });

  return { isPremium: data?.premium ?? false, loading: isLoading };
}
