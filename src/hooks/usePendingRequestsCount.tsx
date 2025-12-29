import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePendingRequestsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count: pendingCount, error } = await supabase
        .from('assignment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && pendingCount !== null) {
        setCount(pendingCount);
      }
    };

    fetchCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending-requests-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignment_requests',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
