import { supabase } from '@/integrations/supabase/client';
import { useUnits, Battalion, Platoon, Squad } from './useUnits';
import { useToast } from '@/hooks/use-toast';

interface UseUnitsManagementReturn {
  battalions: Battalion[];
  platoons: Platoon[];
  squads: Squad[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getPlatoonsForBattalion: (battalionId: string) => Platoon[];
  getSquadsForPlatoon: (platoonId: string) => Squad[];
  // Battalion CRUD
  createBattalion: (data: { name: string; designation?: string }) => Promise<Battalion | null>;
  updateBattalion: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deleteBattalion: (id: string) => Promise<boolean>;
  // Platoon CRUD
  createPlatoon: (data: { name: string; battalion_id: string; designation?: string }) => Promise<Platoon | null>;
  updatePlatoon: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deletePlatoon: (id: string) => Promise<boolean>;
  // Squad CRUD
  createSquad: (data: { name: string; platoon_id: string; designation?: string }) => Promise<Squad | null>;
  updateSquad: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deleteSquad: (id: string) => Promise<boolean>;
}

export function useUnitsManagement(): UseUnitsManagementReturn {
  const { battalions, platoons, squads, loading, error, refetch, getPlatoonsForBattalion, getSquadsForPlatoon } = useUnits();
  const { toast } = useToast();

  // Battalion CRUD
  const createBattalion = async (data: { name: string; designation?: string }): Promise<Battalion | null> => {
    const { data: newBattalion, error } = await supabase
      .from('battalions')
      .insert({ name: data.name, designation: data.designation })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Battalion created successfully' });
    await refetch();
    return newBattalion;
  };

  const updateBattalion = async (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }): Promise<boolean> => {
    const { error } = await supabase
      .from('battalions')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Battalion updated successfully' });
    await refetch();
    return true;
  };

  const deleteBattalion = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('battalions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Battalion deleted successfully' });
    await refetch();
    return true;
  };

  // Platoon CRUD
  const createPlatoon = async (data: { name: string; battalion_id: string; designation?: string }): Promise<Platoon | null> => {
    const { data: newPlatoon, error } = await supabase
      .from('platoons')
      .insert({ name: data.name, battalion_id: data.battalion_id, designation: data.designation })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Platoon created successfully' });
    await refetch();
    return newPlatoon;
  };

  const updatePlatoon = async (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }): Promise<boolean> => {
    const { error } = await supabase
      .from('platoons')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Platoon updated successfully' });
    await refetch();
    return true;
  };

  const deletePlatoon = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('platoons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Platoon deleted successfully' });
    await refetch();
    return true;
  };

  // Squad CRUD
  const createSquad = async (data: { name: string; platoon_id: string; designation?: string }): Promise<Squad | null> => {
    const { data: newSquad, error } = await supabase
      .from('squads')
      .insert({ name: data.name, platoon_id: data.platoon_id, designation: data.designation })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Squad created successfully' });
    await refetch();
    return newSquad;
  };

  const updateSquad = async (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }): Promise<boolean> => {
    const { error } = await supabase
      .from('squads')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Squad updated successfully' });
    await refetch();
    return true;
  };

  const deleteSquad = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('squads')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Squad deleted successfully' });
    await refetch();
    return true;
  };

  return {
    battalions,
    platoons,
    squads,
    loading,
    error,
    refetch,
    getPlatoonsForBattalion,
    getSquadsForPlatoon,
    createBattalion,
    updateBattalion,
    deleteBattalion,
    createPlatoon,
    updatePlatoon,
    deletePlatoon,
    createSquad,
    updateSquad,
    deleteSquad,
  };
}
