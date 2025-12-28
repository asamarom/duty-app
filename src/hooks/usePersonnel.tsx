import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { Personnel } from '@/types/pmtb';

export type PersonnelRow = Tables<'personnel'>;

interface UsePersonnelReturn {
  personnel: Personnel[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Map database row to UI Personnel type
function mapPersonnelRowToUI(row: PersonnelRow & { squads?: { name: string } | null }): Personnel {
  return {
    id: row.id,
    serviceNumber: row.service_number,
    rank: row.rank,
    firstName: row.first_name,
    lastName: row.last_name,
    dutyPosition: (row.duty_position || 'Rifleman') as Personnel['dutyPosition'],
    team: row.squads?.name || 'Unassigned',
    squad: row.squads?.name || 'Unassigned',
    squadId: row.squad_id || undefined,
    role: 'user',
    phone: row.phone || '',
    email: row.email || '',
    localAddress: row.local_address || '',
    locationStatus: row.location_status,
    skills: row.skills || [],
    driverLicenses: row.driver_licenses || [],
    profileImage: row.profile_image || undefined,
    readinessStatus: row.readiness_status,
  };
}

export function usePersonnel(): UsePersonnelReturn {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPersonnel = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('personnel')
        .select('*, squads(name)')
        .order('last_name');

      if (fetchError) throw fetchError;

      const mappedPersonnel = (data || []).map(mapPersonnelRowToUI);
      setPersonnel(mappedPersonnel);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  return {
    personnel,
    loading,
    error,
    refetch: fetchPersonnel,
  };
}
