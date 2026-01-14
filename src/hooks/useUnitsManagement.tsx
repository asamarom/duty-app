import { supabase } from '@/integrations/supabase/client';
import { useUnits, Battalion, Company, Platoon } from './useUnits';
import { useToast } from '@/hooks/use-toast';

interface UseUnitsManagementReturn {
  battalions: Battalion[];
  companies: Company[];
  platoons: Platoon[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getCompaniesForBattalion: (battalionId: string) => Company[];
  getPlatoonsForCompany: (companyId: string) => Platoon[];
  // Battalion CRUD
  createBattalion: (data: { name: string; designation?: string }) => Promise<Battalion | null>;
  updateBattalion: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deleteBattalion: (id: string) => Promise<boolean>;
  // Company CRUD
  createCompany: (data: { name: string; battalion_id: string; designation?: string }) => Promise<Company | null>;
  updateCompany: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;
  // Platoon CRUD
  createPlatoon: (data: { name: string; company_id: string; designation?: string }) => Promise<Platoon | null>;
  updatePlatoon: (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }) => Promise<boolean>;
  deletePlatoon: (id: string) => Promise<boolean>;
}

export function useUnitsManagement(): UseUnitsManagementReturn {
  const {
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
  } = useUnits();
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

  // Company CRUD
  const createCompany = async (data: { name: string; battalion_id: string; designation?: string }): Promise<Company | null> => {
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({ name: data.name, battalion_id: data.battalion_id, designation: data.designation })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Success', description: 'Company created successfully' });
    await refetch();
    return newCompany;
  };

  const updateCompany = async (id: string, data: { name?: string; designation?: string; status?: 'active' | 'deployed' | 'inactive' }): Promise<boolean> => {
    const { error } = await supabase
      .from('companies')
      .update(data)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Company updated successfully' });
    await refetch();
    return true;
  };

  const deleteCompany = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Company deleted successfully' });
    await refetch();
    return true;
  };

  // Platoon CRUD - now under companies
  const createPlatoon = async (data: { name: string; company_id: string; designation?: string }): Promise<Platoon | null> => {
    // Get the company to find the battalion_id for legacy support
    const company = companies.find(c => c.id === data.company_id);

    const { data: newPlatoon, error } = await supabase
      .from('platoons')
      .insert({
        name: data.name,
        company_id: data.company_id,
        battalion_id: company?.battalion_id || '',
        designation: data.designation
      })
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

  return {
    battalions,
    companies,
    platoons,
    loading,
    error,
    refetch,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
    createBattalion,
    updateBattalion,
    deleteBattalion,
    createCompany,
    updateCompany,
    deleteCompany,
    createPlatoon,
    updatePlatoon,
    deletePlatoon,
  };
}
