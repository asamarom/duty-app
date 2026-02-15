import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Users, Briefcase, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnits, Unit, UnitWithChildren } from '@/hooks/useUnits';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnitAssignment {
  unit_id: string | null;
}

interface UnitTreeSelectorProps {
  value: UnitAssignment;
  onChange: (value: UnitAssignment) => void;
  disabled?: boolean;
}

const UNIT_ICONS: Record<string, React.ReactNode> = {
  battalion: <Building2 className="h-4 w-4 text-amber-500" />,
  company: <Briefcase className="h-4 w-4 text-blue-500" />,
  platoon: <Users className="h-4 w-4 text-green-500" />,
};

export function UnitTreeSelector({ value, onChange, disabled }: UnitTreeSelectorProps) {
  const { t } = useLanguage();
  const { units, loading, getUnitPath, buildUnitTree, getUnitAncestors } = useUnits();
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // Auto-expand to show current selection
  useEffect(() => {
    if (value.unit_id) {
      const ancestors = getUnitAncestors(value.unit_id);
      setExpandedUnits(prev => {
        const next = new Set(prev);
        ancestors.forEach(a => next.add(a.id));
        return next;
      });
    }
  }, [value.unit_id, getUnitAncestors]);

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectUnit = (unit: Unit) => {
    onChange({ unit_id: unit.id });
  };

  const clearSelection = () => {
    onChange({ unit_id: null });
  };

  const getSelectedLabel = (): string => {
    if (value.unit_id) {
      return getUnitPath(value.unit_id) || t('units.unknown');
    }
    return t('units.unassigned');
  };

  const renderUnitNode = (unit: UnitWithChildren, level: number = 0) => {
    const isExpanded = expandedUnits.has(unit.id);
    const isSelected = value.unit_id === unit.id;
    const hasChildren = unit.children.length > 0;

    return (
      <div key={unit.id} className="space-y-1">
        <div className="flex items-center" style={{ marginLeft: `${level * 20}px` }}>
          <button
            type="button"
            className="p-1 hover:bg-muted rounded"
            onClick={() => toggleUnit(unit.id)}
          >
            {hasChildren ? (
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
              isSelected && "bg-primary/20 text-primary font-medium"
            )}
            onClick={() => selectUnit(unit)}
          >
            {UNIT_ICONS[unit.unit_type]}
            {unit.name}
            {unit.designation && <span className="text-muted-foreground">({unit.designation})</span>}
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {unit.children.map(child => renderUnitNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="border border-border rounded-md p-4 bg-card">
        <p className="text-muted-foreground text-sm">{t('units.loadingUnits')}</p>
      </div>
    );
  }

  const unitTree = buildUnitTree();

  return (
    <div className="space-y-2">
      {/* Current Selection Display */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md border border-border">
        <span className="text-sm font-medium truncate">{getSelectedLabel()}</span>
        {value.unit_id && !disabled && (
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
          {unitTree.length === 0 ? (
            <p className="text-muted-foreground text-sm p-4">{t('units.noUnitsAvailable')}</p>
          ) : (
            <div className="p-2 space-y-1">
              {unitTree.map(unit => renderUnitNode(unit))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
