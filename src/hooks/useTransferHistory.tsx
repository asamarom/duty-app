import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TransferHistoryRecord } from '@/types/pmtb';

interface UseTransferHistoryReturn {
  history: TransferHistoryRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTransferHistory(equipmentId: string | undefined): UseTransferHistoryReturn {
  const [history, setHistory] = useState<TransferHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!equipmentId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Use approved assignment_requests as transfer history
      const { data, error: fetchError } = await supabase
        .from('assignment_requests')
        .select(`
          id,
          equipment_id,
          from_unit_type,
          from_unit_id,
          from_personnel_id,
          to_unit_type,
          to_unit_id,
          to_personnel_id,
          requested_by,
          requested_at,
          notes,
          status,
          from_unit:units!assignment_requests_from_unit_id_fkey(name),
          from_personnel:personnel!assignment_requests_from_personnel_id_fkey(first_name, last_name),
          to_unit:units!assignment_requests_to_unit_id_fkey(name),
          to_personnel:personnel!assignment_requests_to_personnel_id_fkey(first_name, last_name),
          requester:profiles!assignment_requests_requested_by_fkey(full_name)
        `)
        .eq('equipment_id', equipmentId)
        .eq('status', 'approved')
        .order('requested_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedHistory: TransferHistoryRecord[] = (data || []).map((row: any) => {
        // Determine from name
        let fromName = 'Unassigned';
        if (row.from_personnel) {
          fromName = `${row.from_personnel.first_name} ${row.from_personnel.last_name}`;
        } else if (row.from_unit) {
          fromName = row.from_unit.name;
        }

        // Determine to name
        let toName = 'Unassigned';
        if (row.to_personnel) {
          toName = `${row.to_personnel.first_name} ${row.to_personnel.last_name}`;
        } else if (row.to_unit) {
          toName = row.to_unit.name;
        }

        return {
          id: row.id,
          equipmentId: row.equipment_id,
          quantity: 1,
          fromUnitType: row.from_unit_type,
          fromUnitId: row.from_unit_id,
          fromName,
          toUnitType: row.to_unit_type,
          toUnitId: row.to_unit_id,
          toName,
          transferredBy: row.requested_by,
          transferredByName: row.requester?.full_name,
          transferredAt: row.requested_at,
          notes: row.notes,
        };
      });

      setHistory(mappedHistory);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
  };
}
