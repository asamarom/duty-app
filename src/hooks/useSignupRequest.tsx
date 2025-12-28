import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type SignupRequestStatus = 'none' | 'pending' | 'approved' | 'declined';

interface SignupRequest {
  id: string;
  status: SignupRequestStatus;
  decline_reason: string | null;
  full_name: string;
  email: string;
  service_number: string;
  phone: string | null;
  requested_unit_type: string;
  requested_battalion_id: string | null;
  requested_platoon_id: string | null;
  requested_squad_id: string | null;
  created_at: string;
}

interface UseSignupRequestReturn {
  signupRequest: SignupRequest | null;
  status: SignupRequestStatus;
  loading: boolean;
  refetch: () => Promise<void>;
  submitRequest: (data: {
    fullName: string;
    serviceNumber: string;
    phone?: string;
    unitType: 'battalion' | 'platoon' | 'squad';
    battalionId?: string;
    platoonId?: string;
    squadId?: string;
  }) => Promise<{ error: Error | null }>;
}

export function useSignupRequest(): UseSignupRequestReturn {
  const { user } = useAuth();
  const [signupRequest, setSignupRequest] = useState<SignupRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = async () => {
    if (!user) {
      setSignupRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('signup_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching signup request:', error);
    }

    setSignupRequest(data as SignupRequest | null);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequest();
  }, [user?.id]);

  const submitRequest = async (data: {
    fullName: string;
    serviceNumber: string;
    phone?: string;
    unitType: 'battalion' | 'platoon' | 'squad';
    battalionId?: string;
    platoonId?: string;
    squadId?: string;
  }) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase.from('signup_requests').insert({
      user_id: user.id,
      email: user.email || '',
      full_name: data.fullName,
      service_number: data.serviceNumber,
      phone: data.phone || null,
      requested_unit_type: data.unitType,
      requested_battalion_id: data.battalionId || null,
      requested_platoon_id: data.platoonId || null,
      requested_squad_id: data.squadId || null,
      status: 'pending',
    });

    if (!error) {
      await fetchRequest();
    }

    return { error: error as Error | null };
  };

  const status: SignupRequestStatus = signupRequest?.status || 'none';

  return {
    signupRequest,
    status,
    loading,
    refetch: fetchRequest,
    submitRequest,
  };
}
