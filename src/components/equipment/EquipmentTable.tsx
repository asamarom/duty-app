import { Equipment } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EquipmentTableProps {
  equipment: Equipment[];
}

const statusColors = {
  serviceable: 'status-ready',
  unserviceable: 'status-critical',
  missing: 'status-warning',
};

export function EquipmentTable({ equipment }: EquipmentTableProps) {
  return (
    <div className="card-tactical rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Item
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Serial #
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Qty
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned To
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Inventory
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {equipment.map((item, index) => {
            return (
              <TableRow
                key={item.id}
                className="border-border/30 transition-colors hover:bg-secondary/50 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="font-mono text-xs text-muted-foreground">
                    {item.serialNumber}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{item.quantity}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{item.assignedTo}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {item.assignedType}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn(statusColors[item.status], 'capitalize')}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {new Date(item.lastInventory).toLocaleDateString()}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}