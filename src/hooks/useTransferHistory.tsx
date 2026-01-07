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

      const { data, error: fetchError } = await supabase
        .from('equipment_transfer_history')
        .select(`
          id,
          equipment_id,
          quantity,
          from_unit_type,
          from_battalion_id,
          from_company_id,
          from_platoon_id,
          from_personnel_id,
          to_unit_type,
          to_battalion_id,
          to_company_id,
          to_platoon_id,
          to_personnel_id,
          transferred_by,
          transferred_at,
          notes,
          from_personnel:personnel!equipment_transfer_history_from_personnel_id_fkey(first_name, last_name),
          to_personnel:personnel!equipment_transfer_history_to_personnel_id_fkey(first_name, last_name),
          from_battalion:battalions!equipment_transfer_history_from_battalion_id_fkey(name),
          to_battalion:battalions!equipment_transfer_history_to_battalion_id_fkey(name),
          from_company:companies!equipment_transfer_history_from_company_id_fkey(name),
          to_company:companies!equipment_transfer_history_to_company_id_fkey(name),
          from_platoon:platoons!equipment_transfer_history_from_platoon_id_fkey(name),
          to_platoon:platoons!equipment_transfer_history_to_platoon_id_fkey(name),
          transferred_by_profile:profiles!equipment_transfer_history_transferred_by_fkey(full_name)
        `)
        .eq('equipment_id', equipmentId)
        .order('transferred_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mappedHistory: TransferHistoryRecord[] = (data || []).map((row: any) => {
        // Determine from name
        let fromName = 'Unknown';
        if (row.from_personnel) {
          fromName = `${row.from_personnel.first_name} ${row.from_personnel.last_name}`;
        } else if (row.from_platoon) {
          fromName = row.from_platoon.name;
        } else if (row.from_company) {
          fromName = row.from_company.name;
        } else if (row.from_battalion) {
          fromName = row.from_battalion.name;
        }

        // Determine to name
        let toName = 'Unknown';
        if (row.to_personnel) {
          toName = `${row.to_personnel.first_name} ${row.to_personnel.last_name}`;
        } else if (row.to_platoon) {
          toName = row.to_platoon.name;
        } else if (row.to_company) {
          toName = row.to_company.name;
        } else if (row.to_battalion) {
          toName = row.to_battalion.name;
        }

        return {
          id: row.id,
          equipmentId: row.equipment_id,
          quantity: row.quantity,
          fromUnitType: row.from_unit_type,
          fromName,
          toUnitType: row.to_unit_type,
          toName,
          transferredBy: row.transferred_by,
          transferredByName: row.transferred_by_profile?.full_name,
          transferredAt: row.transferred_at,
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
