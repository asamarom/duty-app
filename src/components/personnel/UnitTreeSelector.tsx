import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Users, Briefcase, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnits, Battalion, Company, Platoon } from '@/hooks/useUnits';

interface UnitAssignment {
  battalion_id: string | null;
  company_id: string | null;
  platoon_id: string | null;
  // Legacy support
  squad_id?: string | null;
}

interface UnitTreeSelectorProps {
  value: UnitAssignment;
  onChange: (value: UnitAssignment) => void;
  disabled?: boolean;
}

export function UnitTreeSelector({ value, onChange, disabled }: UnitTreeSelectorProps) {
  const { battalions, companies, platoons, loading } = useUnits();
  const [expandedBattalions, setExpandedBattalions] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Auto-expand to show current selection
  useEffect(() => {
    if (value.platoon_id) {
      const platoon = platoons.find(p => p.id === value.platoon_id);
      if (platoon && platoon.company_id) {
        const company = companies.find(c => c.id === platoon.company_id);
        if (company) {
          setExpandedBattalions(prev => new Set(prev).add(company.battalion_id));
          setExpandedCompanies(prev => new Set(prev).add(platoon.company_id!));
        }
      }
    } else if (value.company_id) {
      const company = companies.find(c => c.id === value.company_id);
      if (company) {
        setExpandedBattalions(prev => new Set(prev).add(company.battalion_id));
      }
    }
  }, [value, companies, platoons]);

  const toggleBattalion = (id: string) => {
    setExpandedBattalions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectBattalion = (battalion: Battalion) => {
    onChange({
      battalion_id: battalion.id,
      company_id: null,
      platoon_id: null,
      squad_id: null,
    });
  };

  const selectCompany = (company: Company) => {
    onChange({
      battalion_id: company.battalion_id,
      company_id: company.id,
      platoon_id: null,
      squad_id: null,
    });
  };

  const selectPlatoon = (platoon: Platoon) => {
    const company = companies.find(c => c.id === platoon.company_id);
    onChange({
      battalion_id: company?.battalion_id || null,
      company_id: platoon.company_id,
      platoon_id: platoon.id,
      squad_id: null,
    });
  };

  const clearSelection = () => {
    onChange({
      battalion_id: null,
      company_id: null,
      platoon_id: null,
      squad_id: null,
    });
  };

  const isSelected = (type: 'battalion' | 'company' | 'platoon', id: string) => {
    if (type === 'battalion') {
      return value.battalion_id === id && !value.company_id && !value.platoon_id;
    }
    if (type === 'company') {
      return value.company_id === id && !value.platoon_id;
    }
    return value.platoon_id === id;
  };

  const getSelectedLabel = (): string => {
    if (value.platoon_id) {
      const platoon = platoons.find(p => p.id === value.platoon_id);
      const company = companies.find(c => c.id === value.company_id);
      const battalion = battalions.find(b => b.id === value.battalion_id);
      return `${battalion?.name} → ${company?.name} → ${platoon?.name}`;
    }
    if (value.company_id) {
      const company = companies.find(c => c.id === value.company_id);
      const battalion = battalions.find(b => b.id === value.battalion_id);
      return `${battalion?.name} → ${company?.name}`;
    }
    if (value.battalion_id) {
      const battalion = battalions.find(b => b.id === value.battalion_id);
      return battalion?.name || 'Unknown';
    }
    return 'Unassigned';
  };

  if (loading) {
    return (
      <div className="border border-border rounded-md p-4 bg-card">
        <p className="text-muted-foreground text-sm">Loading units...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Current Selection Display */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md border border-border">
        <span className="text-sm font-medium truncate">{getSelectedLabel()}</span>
        {(value.battalion_id || value.company_id || value.platoon_id) && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tree View */}
      {!disabled && (
        <div className="border border-border rounded-md bg-card max-h-64 overflow-y-auto">
          {battalions.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">No units available</p>
          ) : (
            <div className="p-2 space-y-1">
              {battalions.map((battalion) => {
                const battalionCompanies = companies.filter(c => c.battalion_id === battalion.id);
                const isExpanded = expandedBattalions.has(battalion.id);
                const isBattalionSelected = isSelected('battalion', battalion.id);

                return (
                  <div key={battalion.id} className="space-y-1">
                    {/* Battalion Row */}
                    <div className="flex items-center">
                      <button
                        type="button"
                        className="p-1 hover:bg-muted rounded"
                        onClick={() => toggleBattalion(battalion.id)}
                      >
                        {battalionCompanies.length > 0 ? (
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
                          isBattalionSelected && "bg-primary/20 text-primary font-medium"
                        )}
                        onClick={() => selectBattalion(battalion)}
                      >
                        <Building2 className="h-4 w-4 text-amber-500" />
                        {battalion.name}
                      </button>
                    </div>

                    {/* Companies */}
                    {isExpanded && (
                      <div className="ml-5 space-y-1">
                        {battalionCompanies.map((company) => {
                          const companyPlatoons = platoons.filter(p => p.company_id === company.id);
                          const isCompanyExpanded = expandedCompanies.has(company.id);
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
                                    isCompanyExpanded ? (
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
                                  {company.name}
                                </button>
                              </div>

                              {/* Platoons */}
                              {isCompanyExpanded && (
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
                                        {platoon.name}
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
