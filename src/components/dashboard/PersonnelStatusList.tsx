import { Personnel, LocationStatus } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPin, Radio, Clock } from 'lucide-react';

interface PersonnelStatusListProps {
  personnel: Personnel[];
  limit?: number;
}

const statusConfig: Record<LocationStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  on_duty: { label: 'On Duty', variant: 'success' },
  active_mission: { label: 'Active Mission', variant: 'warning' },
  home: { label: 'Home', variant: 'secondary' },
  off_duty: { label: 'Off Duty', variant: 'secondary' },
  leave: { label: 'Leave', variant: 'secondary' },
  tdy: { label: 'TDY', variant: 'secondary' },
};

export function PersonnelStatusList({ personnel, limit }: PersonnelStatusListProps) {
  const displayedPersonnel = limit ? personnel.slice(0, limit) : personnel;

  return (
    <div className="space-y-2">
      {displayedPersonnel.map((person, index) => {
        const status = statusConfig[person.locationStatus];
        return (
          <div
            key={person.id}
            className="flex items-center gap-4 rounded-lg border border-border/50 bg-card/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-card animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Rank Badge */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 font-mono text-xs font-bold text-primary">
              {person.rank}
            </div>

            {/* Name and Position */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {person.rank} {person.lastName}, {person.firstName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {person.dutyPosition} • {person.team}
              </p>
            </div>

            {/* Status */}
            <Badge
              variant={status.variant}
              className={cn(
                'shrink-0',
                status.variant === 'success' && 'status-ready',
                status.variant === 'warning' && 'status-warning',
                status.variant === 'destructive' && 'status-critical'
              )}
            >
              {status.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
