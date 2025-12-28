import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Equipment } from '@/types/pmtb';

export type EquipmentRow = Tables<'equipment'>;

interface UseEquipmentReturn {
  equipment: Equipment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  addEquipment: (item: Omit<Equipment, 'id'>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>;
}

// Map database row to UI Equipment type
function mapEquipmentRowToUI(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    serialNumber: row.serial_number || undefined,
    name: row.name,
    description: row.description || undefined,
    quantity: row.quantity,
    assignedTo: undefined, // Equipment assignments are in a separate table
    assignedType: 'individual', // Default for now
  };
}

export function useEquipment(): UseEquipmentReturn {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;

      const mappedEquipment = (data || []).map(mapEquipmentRowToUI);
      setEquipment(mappedEquipment);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEquipment = useCallback(async (item: Omit<Equipment, 'id'>) => {
    const { error: insertError } = await supabase
      .from('equipment')
      .insert({
        name: item.name,
        serial_number: item.serialNumber || null,
        description: item.description || null,
        quantity: item.quantity,
      });

    if (insertError) throw insertError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const deleteEquipment = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    await fetchEquipment();
  }, [fetchEquipment]);

  const updateEquipment = useCallback(async (id: string, updates: Partial<Equipment>) => {
    const { error: updateError } = await supabase
      .from('equipment')
      .update({
        name: updates.name,
        serial_number: updates.serialNumber || null,
        description: updates.description || null,
        quantity: updates.quantity,
      })
      .eq('id', id);

    if (updateError) throw updateError;
    await fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  return {
    equipment,
    loading,
    error,
    refetch: fetchEquipment,
    addEquipment,
    deleteEquipment,
    updateEquipment,
  };
}
