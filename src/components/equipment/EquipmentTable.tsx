import { useNavigate } from 'react-router-dom';
import { Equipment } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';

interface EquipmentTableProps {
  equipment: Equipment[];
}

export function EquipmentTable({ equipment }: EquipmentTableProps) {
  const navigate = useNavigate();

  return (
    <div className="card-tactical rounded-xl overflow-hidden">
      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y divide-border/30">
        {equipment.map((item, index) => (
          <div
            key={item.id}
            onClick={() => navigate(`/equipment/${item.id}`)}
            className="p-4 transition-colors hover:bg-secondary/50 cursor-pointer animate-fade-in active:bg-secondary/70"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{item.name}</p>
                <code className="font-mono text-xs text-muted-foreground">
                  {item.serialNumber}
                </code>
              </div>
              <span className="font-mono text-sm text-muted-foreground shrink-0">
                x{item.quantity}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground truncate">{item.assignedTo}</span>
              <Badge variant="secondary" className="text-[10px] uppercase shrink-0">
                {item.assignedType}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4">
              Item
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 w-[140px]">
              Serial #
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4 w-[60px]">
              Qty
            </th>
            <th className="text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground p-4">
              Assigned To
            </th>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item, index) => (
            <tr
              key={item.id}
              onClick={() => navigate(`/equipment/${item.id}`)}
              className="border-b border-border/30 transition-colors hover:bg-secondary/50 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <td className="p-4">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </td>
              <td className="p-4">
                <code className="font-mono text-xs text-muted-foreground">
                  {item.serialNumber}
                </code>
              </td>
              <td className="p-4">
                <span className="font-mono text-sm">{item.quantity}</span>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{item.assignedTo}</span>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {item.assignedType}
                  </Badge>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}