import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AssignmentRequest {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  from_unit_type: string;
  from_unit_id?: string;
  from_personnel_id?: string;
  from_unit_name?: string;
  to_unit_type: string;
  to_unit_id?: string;
  to_personnel_id?: string;
  to_unit_name?: string;
  status: AssignmentRequestStatus;
  requested_by?: string;
  requested_by_name?: string;
  requested_at: string;
  notes?: string;
  recipient_approved: boolean;
  recipient_approved_at?: string;
  recipient_approved_by?: string;
}

interface UseAssignmentRequestsReturn {
  requests: AssignmentRequest[];
  incomingTransfers: AssignmentRequest[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createRequest: (data: {
    equipmentId: string;
    toUnitId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => Promise<void>;
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, notes?: string) => Promise<void>;
  recipientApprove: (requestId: string, notes?: string) => Promise<void>;
  recipientReject: (requestId: string, notes?: string) => Promise<void>;
}

export function useAssignmentRequests(): UseAssignmentRequestsReturn {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch requests with equipment and unit info
      const { data: requestsData, error: requestsError } = await supabase
        .from('assignment_requests')
        .select(`
          *,
          equipment(name),
          from_unit:units!assignment_requests_from_unit_id_fkey(name, unit_type),
          from_personnel:personnel!assignment_requests_from_personnel_id_fkey(first_name, last_name),
          to_unit:units!assignment_requests_to_unit_id_fkey(name, unit_type),
          to_personnel:personnel!assignment_requests_to_personnel_id_fkey(first_name, last_name),
          requester:profiles!assignment_requests_requested_by_fkey(full_name)
        `)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      const mappedRequests: AssignmentRequest[] = (requestsData || []).map((r: any) => {
        let fromUnitName = 'Unassigned';
        if (r.from_unit_type === 'individual' && r.from_personnel) {
          fromUnitName = `${r.from_personnel.first_name} ${r.from_personnel.last_name}`;
        } else if (r.from_unit) {
          fromUnitName = r.from_unit.name;
        }

        let toUnitName = 'Unassigned';
        if (r.to_unit_type === 'individual' && r.to_personnel) {
          toUnitName = `${r.to_personnel.first_name} ${r.to_personnel.last_name}`;
        } else if (r.to_unit) {
          toUnitName = r.to_unit.name;
        }

        return {
          id: r.id,
          equipment_id: r.equipment_id,
          equipment_name: r.equipment?.name,
          from_unit_type: r.from_unit_type,
          from_unit_id: r.from_unit_id,
          from_personnel_id: r.from_personnel_id,
          from_unit_name: fromUnitName,
          to_unit_type: r.to_unit_type,
          to_unit_id: r.to_unit_id,
          to_personnel_id: r.to_personnel_id,
          to_unit_name: toUnitName,
          status: r.status as AssignmentRequestStatus,
          requested_by: r.requested_by,
          requested_by_name: r.requester?.full_name,
          requested_at: r.requested_at,
          notes: r.notes,
          recipient_approved: r.recipient_approved || false,
          recipient_approved_at: r.recipient_approved_at,
          recipient_approved_by: r.recipient_approved_by,
        };
      });

      setRequests(mappedRequests);

      // Filter incoming transfers - those needing recipient approval
      const incoming = mappedRequests.filter(r =>
        r.status === 'pending' && !r.recipient_approved
      );
      setIncomingTransfers(incoming);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (data: {
    equipmentId: string;
    toUnitId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => {
    const { error: rpcError } = await supabase.rpc('initiate_transfer', {
      p_equipment_id: data.equipmentId,
      p_to_unit_id: data.toUnitId || null,
      p_to_personnel_id: data.toPersonnelId || null,
      p_notes: data.notes || null,
    });

    if (rpcError) throw rpcError;

    await fetchRequests();
  }, [fetchRequests]);

  const approveRequest = useCallback(async (requestId: string, notes?: string) => {
    const { error: rpcError } = await supabase.rpc('process_transfer', {
      p_request_id: requestId,
      p_action: 'approved',
      p_notes: notes || null,
    });

    if (rpcError) throw rpcError;

    await fetchRequests();
  }, [fetchRequests]);

  const rejectRequest = useCallback(async (requestId: string, notes?: string) => {
    const { error: rpcError } = await supabase.rpc('process_transfer', {
      p_request_id: requestId,
      p_action: 'rejected',
      p_notes: notes || null,
    });

    if (rpcError) throw rpcError;

    await fetchRequests();
  }, [fetchRequests]);

  const recipientApprove = useCallback(async (requestId: string, notes?: string) => {
    await approveRequest(requestId, notes ? `Recipient approved: ${notes}` : 'Recipient approved the transfer');
  }, [approveRequest]);

  const recipientReject = useCallback(async (requestId: string, notes?: string) => {
    await rejectRequest(requestId, notes ? `Recipient rejected: ${notes}` : 'Recipient rejected the transfer');
  }, [rejectRequest]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    incomingTransfers,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    recipientApprove,
    recipientReject,
  };
}
