import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Building2, Briefcase, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUnits, Unit, UnitWithChildren } from '@/hooks/useUnits';
import { useLanguage } from '@/contexts/LanguageContext';

export interface UnitSelection {
  unitId: string;
}

interface BattalionUnitSelectorProps {
  value: UnitSelection;
  onChange: (value: UnitSelection) => void;
  disabled?: boolean;
}

const UNIT_ICONS: Record<string, React.ReactNode> = {
  battalion: <Building2 className="h-4 w-4 text-amber-500" />,
  company: <Briefcase className="h-4 w-4 text-blue-500" />,
  platoon: <Users className="h-4 w-4 text-green-500" />,
};

export function BattalionUnitSelector({ value, onChange, disabled }: BattalionUnitSelectorProps) {
  const { battalions, loading, getUnitById, getChildUnits, getUnitPath } = useUnits();
  const { t } = useLanguage();
  const [selectedBattalionId, setSelectedBattalionId] = useState<string>('');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // Determine selected battalion from current value
  useEffect(() => {
    if (value.unitId) {
      const unit = getUnitById(value.unitId);
      if (unit) {
        if (unit.unit_type === 'battalion') {
          setSelectedBattalionId(unit.id);
        } else {
          // Find the battalion ancestor
          let current = unit;
          while (current.parent_id) {
            const parent = getUnitById(current.parent_id);
            if (!parent) break;
            if (parent.unit_type === 'battalion') {
              setSelectedBattalionId(parent.id);
              break;
            }
            current = parent;
          }
        }
      }
    }
  }, [value.unitId, getUnitById]);

  const toggleUnit = useCallback((id: string) => {
    setExpandedUnits(prev => {
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
    setSelectedBattalionId(battalionId);
    onChange({ unitId: battalionId });
    setExpandedUnits(new Set());
  }, [onChange]);

  const selectUnit = useCallback((unit: Unit) => {
    onChange({ unitId: unit.id });
  }, [onChange]);

  const isSelected = useCallback((unitId: string) => {
    return value.unitId === unitId;
  }, [value.unitId]);

  const getSelectionLabel = (): string => {
    if (!value.unitId) return t('signup.noUnitSelected');
    return getUnitPath(value.unitId) || t('signup.noUnitSelected');
  };

  const renderUnitNode = (unit: Unit, level: number = 0) => {
    const children = getChildUnits(unit.id);
    const isExpanded = expandedUnits.has(unit.id);
    const isUnitSelected = isSelected(unit.id);
    const hasChildren = children.length > 0;

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
              isUnitSelected && "bg-primary/20 text-primary font-medium"
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
            {children.map(child => renderUnitNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get children of selected battalion (companies and their platoons)
  const battalionChildren = selectedBattalionId ? getChildUnits(selectedBattalionId) : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('signup.selectBattalion')}</Label>
          <div className="h-10 bg-muted animate-pulse rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Battalion Selector */}
      <div className="space-y-2">
        <Label>{t('signup.selectBattalion')}</Label>
        <Select
          value={selectedBattalionId}
          onValueChange={handleBattalionChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('signup.selectBattalionPlaceholder')} />
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
      {selectedBattalionId && (
        <div className="space-y-2">
          <Label>{t('signup.selectUnit')}</Label>

          {/* Current Selection Display */}
          <div className="p-2 bg-muted/50 rounded-md border border-border">
            <span className="text-sm font-medium">{getSelectionLabel()}</span>
          </div>

          {/* Tree View */}
          {!disabled && (
            <div className="border border-border rounded-md bg-card max-h-64 overflow-y-auto">
              {battalionChildren.length === 0 ? (
                <p className="text-muted-foreground text-sm p-4">
                  {t('signup.noSubUnits')}
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {battalionChildren.map(unit => renderUnitNode(unit))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
