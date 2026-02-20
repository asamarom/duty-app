import { useNavigate } from 'react-router-dom';
import { EquipmentWithAssignment } from '@/hooks/useEquipment';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';

interface EquipmentTableProps {
  equipment: EquipmentWithAssignment[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function EquipmentTable({
  equipment,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange
}: EquipmentTableProps) {
  const navigate = useNavigate();
  const { t, dir } = useLanguage();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange?.(new Set(equipment.map(item => item.id)));
    } else {
      onSelectionChange?.(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    onSelectionChange?.(newSelection);
  };

  const allSelected = equipment.length > 0 && equipment.every(item => selectedIds.has(item.id));
  const someSelected = equipment.some(item => selectedIds.has(item.id)) && !allSelected;

  return (
    <div className="card-tactical rounded-xl overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-border/30">
        {equipment.map((item, index) => (
          <div
            key={item.id}
            className={`p-4 transition-colors hover:bg-secondary/50 animate-fade-in ${selectable ? '' : 'cursor-pointer active:bg-secondary/70'
              } ${selectedIds.has(item.id) ? 'bg-primary/10' : ''}`}
            style={{ animationDelay: `${index * 30}ms` }}
            onClick={() => !selectable && navigate(`/equipment/${item.id}`)}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <Checkbox
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium text-foreground truncate ${selectable ? 'cursor-pointer hover:underline' : ''}`}
                      onClick={(e) => {
                        if (selectable) {
                          e.stopPropagation();
                          navigate(`/equipment/${item.id}`);
                        }
                      }}
                    >
                      {item.name}
                    </p>
                    <code className="font-mono text-xs text-muted-foreground">
                      {item.serialNumber}
                    </code>
                  </div>
                  <span className="font-mono text-sm text-muted-foreground shrink-0">
                    x{item.currentQuantity}
                  </span>
                </div>
                {item.assignedTo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs font-medium">
                      {item.assignedTo}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr className="border-b border-border/50">
            {selectable && (
              <th className="p-4 w-[50px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement).dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </th>
            )}
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4">
              {t('equipment.tableItem')}
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 w-[140px]">
              {t('equipment.tableSerialNum')}
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 w-[60px]">
              {t('equipment.tableQty')}
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4">
              {t('equipment.assignedTo')}
            </th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item, index) => (
            <tr
              key={item.id}
              className={`border-b border-border/30 transition-colors hover:bg-secondary/50 animate-fade-in ${selectable ? '' : 'cursor-pointer'
                } ${selectedIds.has(item.id) ? 'bg-primary/10' : ''}`}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => !selectable && navigate(`/equipment/${item.id}`)}
            >
              {selectable && (
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                  />
                </td>
              )}
              <td className="p-4">
                <div>
                  <p
                    className={`font-medium text-foreground ${selectable ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={(e) => {
                      if (selectable) {
                        e.stopPropagation();
                        navigate(`/equipment/${item.id}`);
                      }
                    }}
                  >
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </td>
              <td className="p-4">
                <code className="font-mono text-xs text-muted-foreground">
                  {item.serialNumber}
                </code>
              </td>
              <td className="p-4">
                <span className="font-mono text-sm">{item.currentQuantity}</span>
              </td>
              <td className="p-4">
                {item.assignedTo ? (
                  <Badge variant="outline" className="text-xs font-medium">
                    {item.assignedTo}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">{t('equipment.unassigned')}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}