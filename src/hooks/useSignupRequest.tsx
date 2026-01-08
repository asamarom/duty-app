import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

export type SignupRequest = Tables<'signup_requests'>;
export type SignupRequestStatus = 'pending' | 'approved' | 'declined' | 'none';

interface UseSignupRequestReturn {
  request: SignupRequest | null;
  status: SignupRequestStatus;
  loading: boolean;
  error: Error | null;
  submitRequest: (data: {
    fullName: string;
    email: string;
    phone?: string;
    serviceNumber: string;
    unitType: 'battalion' | 'company' | 'platoon' | 'squad';
    battalionId?: string;
    companyId?: string;
    platoonId?: string;
    squadId?: string;
  }) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

export function useSignupRequest(): UseSignupRequestReturn {
  const { user } = useAuth();
  const [request, setRequest] = useState<SignupRequest | null>(null);
  const [status, setStatus] = useState<SignupRequestStatus>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequest = async () => {
    if (!user) {
      setLoading(false);
      setStatus('none');
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('signup_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setRequest(data);
        setStatus(data.status);
      } else {
        setRequest(null);
        setStatus('none');
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [user?.id]);

  const submitRequest = async (data: {
    fullName: string;
    email: string;
    phone?: string;
    serviceNumber: string;
    unitType: 'battalion' | 'company' | 'platoon' | 'squad';
    battalionId?: string;
    companyId?: string;
    platoonId?: string;
    squadId?: string;
  }) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error: insertError } = await supabase.from('signup_requests').insert({
        user_id: user.id,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        service_number: data.serviceNumber,
        requested_unit_type: data.unitType,
        requested_battalion_id: data.battalionId || null,
        requested_company_id: data.companyId || null,
        requested_platoon_id: data.platoonId || null,
        requested_squad_id: data.squadId || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      await fetchRequest();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    request,
    status,
    loading,
    error,
    submitRequest,
    refetch: fetchRequest,
  };
}
