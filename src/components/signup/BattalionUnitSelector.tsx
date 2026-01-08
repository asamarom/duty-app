import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Building2, Briefcase, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUnits, Battalion, Company, Platoon } from '@/hooks/useUnits';

export interface UnitSelection {
  battalionId: string;
  companyId: string | null;
  platoonId: string | null;
}

interface BattalionUnitSelectorProps {
  value: UnitSelection;
  onChange: (value: UnitSelection) => void;
  disabled?: boolean;
}

export function BattalionUnitSelector({ value, onChange, disabled }: BattalionUnitSelectorProps) {
  const { battalions, companies, platoons, loading } = useUnits();
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Auto-expand to show current selection
  useEffect(() => {
    if (value.platoonId) {
      const platoon = platoons.find(p => p.id === value.platoonId);
      if (platoon?.company_id) {
        setExpandedCompanies(prev => new Set(prev).add(platoon.company_id!));
      }
    }
  }, [value.platoonId, platoons]);

  const toggleCompany = useCallback((id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBattalionChange = useCallback((battalionId: string) => {
    onChange({
      battalionId,
      companyId: null,
      platoonId: null,
    });
    setExpandedCompanies(new Set());
  }, [onChange]);

  const selectCompany = useCallback((company: Company) => {
    onChange({
      battalionId: value.battalionId,
      companyId: company.id,
      platoonId: null,
    });
  }, [onChange, value.battalionId]);

  const selectPlatoon = useCallback((platoon: Platoon) => {
    onChange({
      battalionId: value.battalionId,
      companyId: platoon.company_id,
      platoonId: platoon.id,
    });
  }, [onChange, value.battalionId]);

  const isSelected = useCallback((type: 'company' | 'platoon', id: string) => {
    if (type === 'company') {
      return value.companyId === id && !value.platoonId;
    }
    return value.platoonId === id;
  }, [value.companyId, value.platoonId]);

  const getSelectionLabel = (): string => {
    if (!value.battalionId) return 'No unit selected';
    
    const battalion = battalions.find(b => b.id === value.battalionId);
    if (!battalion) return 'Unknown battalion';

    if (value.platoonId) {
      const platoon = platoons.find(p => p.id === value.platoonId);
      const company = companies.find(c => c.id === value.companyId);
      return `${battalion.name} → ${company?.name || '?'} → ${platoon?.name || '?'}`;
    }
    if (value.companyId) {
      const company = companies.find(c => c.id === value.companyId);
      return `${battalion.name} → ${company?.name || '?'}`;
    }
    return battalion.name;
  };

  // Filter units for selected battalion
  const battalionCompanies = value.battalionId 
    ? companies.filter(c => c.battalion_id === value.battalionId)
    : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Battalion</Label>
          <div className="h-10 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Battalion Selector */}
      <div className="space-y-2">
        <Label>Battalion</Label>
        <Select 
          value={value.battalionId} 
          onValueChange={handleBattalionChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your battalion" />
          </SelectTrigger>
          <SelectContent>
            {battalions.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  {b.name} {b.designation && `(${b.designation})`}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit Tree (only shown after battalion is selected) */}
      {value.battalionId && (
        <div className="space-y-2">
          <Label>Select Your Unit</Label>
          
          {/* Current Selection Display */}
          <div className="p-2 bg-muted/50 rounded-md border border-border">
            <span className="text-sm font-medium">{getSelectionLabel()}</span>
          </div>

          {/* Tree View */}
          {!disabled && (
            <div className="border border-border rounded-md bg-card max-h-64 overflow-y-auto">
              {battalionCompanies.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">
                  No companies in this battalion. You'll be assigned to the battalion level.
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {battalionCompanies.map((company) => {
                    const companyPlatoons = platoons.filter(p => p.company_id === company.id);
                    const isExpanded = expandedCompanies.has(company.id);
                    const isCompanySelected = isSelected('company', company.id);

                    return (
                      <div key={company.id} className="space-y-1">
                        {/* Company Row */}
                        <div className="flex items-center">
                          <button
                            type="button"
                            className="p-1 hover:bg-muted rounded"
                            onClick={() => toggleCompany(company.id)}
                          >
                            {companyPlatoons.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )
                            ) : (
                              <div className="w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            className={cn(
                              "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors",
                              isCompanySelected && "bg-primary/20 text-primary font-medium"
                            )}
                            onClick={() => selectCompany(company)}
                          >
                            <Briefcase className="h-4 w-4 text-blue-500" />
                            {company.name} {company.designation && `(${company.designation})`}
                          </button>
                        </div>

                        {/* Platoons */}
                        {isExpanded && companyPlatoons.length > 0 && (
                          <div className="ml-5 space-y-1">
                            {companyPlatoons.map((platoon) => {
                              const isPlatoonSelected = isSelected('platoon', platoon.id);

                              return (
                                <button
                                  key={platoon.id}
                                  type="button"
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors",
                                    isPlatoonSelected && "bg-primary/20 text-primary font-medium"
                                  )}
                                  onClick={() => selectPlatoon(platoon)}
                                >
                                  <Users className="h-4 w-4 text-green-500" />
                                  {platoon.name} {platoon.designation && `(${platoon.designation})`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
