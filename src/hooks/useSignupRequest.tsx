import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from './useAuth';
import type { SignupRequestDoc, SignupRequestStatus } from '@/integrations/firebase/types';

export interface SignupRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  service_number: string;
  requested_unit_id: string | null;
  status: SignupRequestStatus;
  decline_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type { SignupRequestStatus };
export type SignupRequestStatusWithNone = SignupRequestStatus | 'none';

interface UseSignupRequestReturn {
  request: SignupRequest | null;
  status: SignupRequestStatusWithNone;
  loading: boolean;
  error: Error | null;
  submitRequest: (data: {
    fullName: string;
    email: string;
    phone?: string;
    serviceNumber: string;
    unitId: string;
  }) => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

function mapDocToSignupRequest(id: string, data: SignupRequestDoc): SignupRequest {
  return {
    id,
    user_id: data.userId,
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    service_number: data.serviceNumber,
    requested_unit_id: data.requestedUnitId,
    status: data.status,
    decline_reason: data.declineReason,
    reviewed_by: data.reviewedBy,
    reviewed_at: data.reviewedAt?.toDate().toISOString() || null,
    created_at: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
    updated_at: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
  };
}

export function useSignupRequest(): UseSignupRequestReturn {
  const { user, loading: authLoading } = useAuth();
  const [request, setRequest] = useState<SignupRequest | null>(null);
  const [status, setStatus] = useState<SignupRequestStatusWithNone>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequest = async () => {
    // Keep loading while auth is still initializing to avoid a brief
    // status:'none' flash that causes ProtectedRoute to redirect incorrectly
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setStatus('none');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore query timeout after 10s')), 10000);
      });

      const requestsRef = collection(db, 'signupRequests');
      const q = query(
        requestsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await Promise.race([getDocs(q), timeoutPromise]);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as SignupRequestDoc;
        const mappedRequest = mapDocToSignupRequest(doc.id, data);
        setRequest(mappedRequest);
        setStatus(mappedRequest.status);
      } else {
        setRequest(null);
        setStatus('none');
      }
    } catch (err) {
      console.error('useSignupRequest: Firestore error', err);
      setError(err as Error);
      setRequest(null);
      setStatus('none');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading]);

  const submitRequest = async (data: {
    fullName: string;
    email: string;
    phone?: string;
    serviceNumber: string;
    unitId: string;
  }) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const requestsRef = collection(db, 'signupRequests');
      await addDoc(requestsRef, {
        userId: user.uid,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        serviceNumber: data.serviceNumber,
        requestedUnitId: data.unitId,
        status: 'pending',
        declineReason: null,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Omit<SignupRequestDoc, 'createdAt' | 'updatedAt'> & { createdAt: ReturnType<typeof serverTimestamp>; updatedAt: ReturnType<typeof serverTimestamp> });

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
