import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Users, UserSquare2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnits, Battalion, Platoon, Squad } from '@/hooks/useUnits';

interface UnitAssignment {
  battalion_id: string | null;
  platoon_id: string | null;
  squad_id: string | null;
}

interface UnitTreeSelectorProps {
  value: UnitAssignment;
  onChange: (value: UnitAssignment) => void;
  disabled?: boolean;
}

export function UnitTreeSelector({ value, onChange, disabled }: UnitTreeSelectorProps) {
  const { battalions, platoons, squads, loading } = useUnits();
  const [expandedBattalions, setExpandedBattalions] = useState<Set<string>>(new Set());
  const [expandedPlatoons, setExpandedPlatoons] = useState<Set<string>>(new Set());

  // Auto-expand to show current selection
  useEffect(() => {
    if (value.squad_id) {
      const squad = squads.find(s => s.id === value.squad_id);
      if (squad) {
        const platoon = platoons.find(p => p.id === squad.platoon_id);
        if (platoon) {
          setExpandedBattalions(prev => new Set(prev).add(platoon.battalion_id));
          setExpandedPlatoons(prev => new Set(prev).add(squad.platoon_id));
        }
      }
    } else if (value.platoon_id) {
      const platoon = platoons.find(p => p.id === value.platoon_id);
      if (platoon) {
        setExpandedBattalions(prev => new Set(prev).add(platoon.battalion_id));
      }
    }
  }, [value, squads, platoons]);

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

  const togglePlatoon = (id: string) => {
    setExpandedPlatoons(prev => {
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
      platoon_id: null,
      squad_id: null,
    });
  };

  const selectPlatoon = (platoon: Platoon) => {
    onChange({
      battalion_id: platoon.battalion_id,
      platoon_id: platoon.id,
      squad_id: null,
    });
  };

  const selectSquad = (squad: Squad) => {
    const platoon = platoons.find(p => p.id === squad.platoon_id);
    onChange({
      battalion_id: platoon?.battalion_id || null,
      platoon_id: squad.platoon_id,
      squad_id: squad.id,
    });
  };

  const clearSelection = () => {
    onChange({
      battalion_id: null,
      platoon_id: null,
      squad_id: null,
    });
  };

  const isSelected = (type: 'battalion' | 'platoon' | 'squad', id: string) => {
    if (type === 'battalion') {
      return value.battalion_id === id && !value.platoon_id && !value.squad_id;
    }
    if (type === 'platoon') {
      return value.platoon_id === id && !value.squad_id;
    }
    return value.squad_id === id;
  };

  const getSelectedLabel = (): string => {
    if (value.squad_id) {
      const squad = squads.find(s => s.id === value.squad_id);
      const platoon = platoons.find(p => p.id === value.platoon_id);
      const battalion = battalions.find(b => b.id === value.battalion_id);
      return `${battalion?.name} → ${platoon?.name} → ${squad?.name}`;
    }
    if (value.platoon_id) {
      const platoon = platoons.find(p => p.id === value.platoon_id);
      const battalion = battalions.find(b => b.id === value.battalion_id);
      return `${battalion?.name} → ${platoon?.name}`;
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
        {(value.battalion_id || value.platoon_id || value.squad_id) && !disabled && (
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
                const battalionPlatoons = platoons.filter(p => p.battalion_id === battalion.id);
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
                        {battalionPlatoons.length > 0 ? (
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

                    {/* Platoons */}
                    {isExpanded && (
                      <div className="ml-5 space-y-1">
                        {battalionPlatoons.map((platoon) => {
                          const platoonSquads = squads.filter(s => s.platoon_id === platoon.id);
                          const isPlatoonExpanded = expandedPlatoons.has(platoon.id);
                          const isPlatoonSelected = isSelected('platoon', platoon.id);

                          return (
                            <div key={platoon.id} className="space-y-1">
                              {/* Platoon Row */}
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  className="p-1 hover:bg-muted rounded"
                                  onClick={() => togglePlatoon(platoon.id)}
                                >
                                  {platoonSquads.length > 0 ? (
                                    isPlatoonExpanded ? (
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
                                    isPlatoonSelected && "bg-primary/20 text-primary font-medium"
                                  )}
                                  onClick={() => selectPlatoon(platoon)}
                                >
                                  <Users className="h-4 w-4 text-blue-500" />
                                  {platoon.name}
                                </button>
                              </div>

                              {/* Squads */}
                              {isPlatoonExpanded && (
                                <div className="ml-5 space-y-1">
                                  {platoonSquads.map((squad) => {
                                    const isSquadSelected = isSelected('squad', squad.id);

                                    return (
                                      <button
                                        key={squad.id}
                                        type="button"
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left hover:bg-muted transition-colors",
                                          isSquadSelected && "bg-primary/20 text-primary font-medium"
                                        )}
                                        onClick={() => selectSquad(squad)}
                                      >
                                        <UserSquare2 className="h-4 w-4 text-green-500" />
                                        {squad.name}
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
