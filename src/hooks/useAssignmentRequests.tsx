import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AssignmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AssignmentRequest {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  from_unit_type: string;
  from_battalion_id?: string;
  from_company_id?: string;
  from_platoon_id?: string;
  from_personnel_id?: string;
  from_unit_name?: string;
  to_unit_type: string;
  to_battalion_id?: string;
  to_company_id?: string;
  to_platoon_id?: string;
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

export interface AssignmentApproval {
  id: string;
  request_id: string;
  action: 'approved' | 'rejected';
  action_by?: string;
  action_by_name?: string;
  action_at: string;
  notes?: string;
}

interface UseAssignmentRequestsReturn {
  requests: AssignmentRequest[];
  approvals: AssignmentApproval[];
  incomingTransfers: AssignmentRequest[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createRequest: (data: {
    equipmentId: string;
    fromUnitType: string;
    fromBattalionId?: string;
    fromCompanyId?: string;
    fromPlatoonId?: string;
    fromPersonnelId?: string;
    toUnitType: string;
    toBattalionId?: string;
    toCompanyId?: string;
    toPlatoonId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => Promise<void>;
  approveRequest: (requestId: string, notes?: string) => Promise<void>;
  rejectRequest: (requestId: string, notes?: string) => Promise<void>;
  recipientApprove: (requestId: string, notes?: string) => Promise<void>;
  recipientReject: (requestId: string, notes?: string) => Promise<void>;
  getApprovalsForRequest: (requestId: string) => AssignmentApproval[];
}

export function useAssignmentRequests(): UseAssignmentRequestsReturn {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [approvals, setApprovals] = useState<AssignmentApproval[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch requests with equipment info
      const { data: requestsData, error: requestsError } = await supabase
        .from('assignment_requests')
        .select(`
          *,
          equipment(name),
          from_battalion:battalions!assignment_requests_from_battalion_id_fkey(name),
          from_company:companies!assignment_requests_from_company_id_fkey(name),
          from_platoon:platoons!assignment_requests_from_platoon_id_fkey(name),
          from_personnel:personnel!assignment_requests_from_personnel_id_fkey(first_name, last_name),
          to_battalion:battalions!assignment_requests_to_battalion_id_fkey(name),
          to_company:companies!assignment_requests_to_company_id_fkey(name),
          to_platoon:platoons!assignment_requests_to_platoon_id_fkey(name),
          to_personnel:personnel!assignment_requests_to_personnel_id_fkey(first_name, last_name),
          requester:profiles!assignment_requests_requested_by_fkey(full_name)
        `)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      const mappedRequests: AssignmentRequest[] = (requestsData || []).map((r: any) => {
        let fromUnitName = 'Unassigned';
        if (r.from_unit_type === 'battalion' && r.from_battalion) {
          fromUnitName = r.from_battalion.name;
        } else if (r.from_unit_type === 'company' && r.from_company) {
          fromUnitName = r.from_company.name;
        } else if (r.from_unit_type === 'platoon' && r.from_platoon) {
          fromUnitName = r.from_platoon.name;
        } else if (r.from_unit_type === 'individual' && r.from_personnel) {
          fromUnitName = `${r.from_personnel.first_name} ${r.from_personnel.last_name}`;
        }

        let toUnitName = 'Unassigned';
        if (r.to_unit_type === 'battalion' && r.to_battalion) {
          toUnitName = r.to_battalion.name;
        } else if (r.to_unit_type === 'company' && r.to_company) {
          toUnitName = r.to_company.name;
        } else if (r.to_unit_type === 'platoon' && r.to_platoon) {
          toUnitName = r.to_platoon.name;
        } else if (r.to_unit_type === 'individual' && r.to_personnel) {
          toUnitName = `${r.to_personnel.first_name} ${r.to_personnel.last_name}`;
        }

        return {
          id: r.id,
          equipment_id: r.equipment_id,
          equipment_name: r.equipment?.name,
          from_unit_type: r.from_unit_type,
          from_battalion_id: r.from_battalion_id,
          from_company_id: r.from_company_id,
          from_platoon_id: r.from_platoon_id,
          from_personnel_id: r.from_personnel_id,
          from_unit_name: fromUnitName,
          to_unit_type: r.to_unit_type,
          to_battalion_id: r.to_battalion_id,
          to_company_id: r.to_company_id,
          to_platoon_id: r.to_platoon_id,
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
      // (pending requests where recipient hasn't approved yet)
      const incoming = mappedRequests.filter(r => 
        r.status === 'pending' && !r.recipient_approved
      );
      setIncomingTransfers(incoming);

      // Fetch approvals
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('assignment_approvals')
        .select(`
          *,
          actor:profiles!assignment_approvals_action_by_fkey(full_name)
        `)
        .order('action_at', { ascending: false });

      if (approvalsError) throw approvalsError;

      const mappedApprovals: AssignmentApproval[] = (approvalsData || []).map((a: any) => ({
        id: a.id,
        request_id: a.request_id,
        action: a.action as 'approved' | 'rejected',
        action_by: a.action_by,
        action_by_name: a.actor?.full_name,
        action_at: a.action_at,
        notes: a.notes,
      }));

      setApprovals(mappedApprovals);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (data: {
    equipmentId: string;
    fromUnitType: string;
    fromBattalionId?: string;
    fromCompanyId?: string;
    fromPlatoonId?: string;
    fromPersonnelId?: string;
    toUnitType: string;
    toBattalionId?: string;
    toCompanyId?: string;
    toPlatoonId?: string;
    toPersonnelId?: string;
    notes?: string;
  }) => {
    const { error: insertError } = await supabase
      .from('assignment_requests')
      .insert({
        equipment_id: data.equipmentId,
        from_unit_type: data.fromUnitType,
        from_battalion_id: data.fromBattalionId || null,
        from_company_id: data.fromCompanyId || null,
        from_platoon_id: data.fromPlatoonId || null,
        from_personnel_id: data.fromPersonnelId || null,
        to_unit_type: data.toUnitType,
        to_battalion_id: data.toBattalionId || null,
        to_company_id: data.toCompanyId || null,
        to_platoon_id: data.toPlatoonId || null,
        to_personnel_id: data.toPersonnelId || null,
        requested_by: user?.id || null,
        notes: data.notes || null,
      });

    if (insertError) throw insertError;
    await fetchRequests();
  }, [user?.id, fetchRequests]);

  const approveRequest = useCallback(async (requestId: string, notes?: string) => {
    // Get the request details first
    const { data: request, error: fetchError } = await supabase
      .from('assignment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update request status
    const { error: updateError } = await supabase
      .from('assignment_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Create approval record
    const { error: approvalError } = await supabase
      .from('assignment_approvals')
      .insert({
        request_id: requestId,
        action: 'approved',
        action_by: user?.id || null,
        notes: notes || null,
      });

    if (approvalError) throw approvalError;

    // Actually perform the assignment - close old assignment
    await supabase
      .from('equipment_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('equipment_id', request.equipment_id)
      .is('returned_at', null);

    // Create new assignment
    const { error: assignError } = await supabase
      .from('equipment_assignments')
      .insert({
        equipment_id: request.equipment_id,
        personnel_id: request.to_personnel_id || null,
        platoon_id: request.to_platoon_id || null,
        company_id: request.to_company_id || null,
        battalion_id: request.to_battalion_id || null,
        assigned_by: user?.id || null,
      });

    if (assignError) throw assignError;
    await fetchRequests();
  }, [user?.id, fetchRequests]);

  const rejectRequest = useCallback(async (requestId: string, notes?: string) => {
    // Get the request details first to know the original unit
    const { data: request, error: fetchError } = await supabase
      .from('assignment_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('assignment_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    const { error: approvalError } = await supabase
      .from('assignment_approvals')
      .insert({
        request_id: requestId,
        action: 'rejected',
        action_by: user?.id || null,
        notes: notes || null,
      });

    if (approvalError) throw approvalError;

    // Reassign the equipment back to the original unit
    // Close any current pending assignment
    await supabase
      .from('equipment_assignments')
      .update({ returned_at: new Date().toISOString() })
      .eq('equipment_id', request.equipment_id)
      .is('returned_at', null);

    // Create assignment back to the original unit
    const { error: assignError } = await supabase
      .from('equipment_assignments')
      .insert({
        equipment_id: request.equipment_id,
        personnel_id: request.from_personnel_id || null,
        platoon_id: request.from_platoon_id || null,
        company_id: request.from_company_id || null,
        battalion_id: request.from_battalion_id || null,
        assigned_by: user?.id || null,
        notes: 'Reassigned after transfer rejection',
      });

    if (assignError) throw assignError;
    await fetchRequests();
  }, [user?.id, fetchRequests]);

  // Recipient approves the incoming transfer
  const recipientApprove = useCallback(async (requestId: string, notes?: string) => {
    const { error: updateError } = await supabase
      .from('assignment_requests')
      .update({ 
        recipient_approved: true,
        recipient_approved_at: new Date().toISOString(),
        recipient_approved_by: user?.id || null,
      })
      .eq('id', requestId);

    if (updateError) throw updateError;
    
    // Create an approval record for this action
    await supabase
      .from('assignment_approvals')
      .insert({
        request_id: requestId,
        action: 'approved',
        action_by: user?.id || null,
        notes: notes ? `Recipient approved: ${notes}` : 'Recipient approved the transfer',
      });

    await fetchRequests();
  }, [user?.id, fetchRequests]);

  // Recipient rejects the incoming transfer (rejects the whole request)
  const recipientReject = useCallback(async (requestId: string, notes?: string) => {
    // Recipient rejection rejects the entire request
    await rejectRequest(requestId, notes ? `Recipient rejected: ${notes}` : 'Recipient rejected the transfer');
  }, [rejectRequest]);

  const getApprovalsForRequest = useCallback((requestId: string) => {
    return approvals.filter(a => a.request_id === requestId);
  }, [approvals]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    approvals,
    incomingTransfers,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    recipientApprove,
    recipientReject,
    getApprovalsForRequest,
  };
}
