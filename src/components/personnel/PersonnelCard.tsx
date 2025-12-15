import { Personnel, LocationStatus } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Phone, Mail, MapPin, Award, Car, ChevronRight } from 'lucide-react';

interface PersonnelCardProps {
  person: Personnel;
  onClick?: () => void;
}

const statusConfig: Record<LocationStatus, { label: string; className: string }> = {
  on_duty: { label: 'On Duty', className: 'status-ready' },
  active_mission: { label: 'Active Mission', className: 'status-warning' },
  home: { label: 'Home', className: 'bg-secondary text-secondary-foreground' },
  off_duty: { label: 'Off Duty', className: 'bg-secondary text-secondary-foreground' },
  leave: { label: 'Leave', className: 'bg-muted text-muted-foreground' },
  tdy: { label: 'TDY', className: 'bg-tactical-blue/20 text-tactical-blue border border-tactical-blue/30' },
};

const readinessColors = {
  ready: 'border-l-success',
  warning: 'border-l-warning',
  critical: 'border-l-destructive',
};

export function PersonnelCard({ person, onClick }: PersonnelCardProps) {
  const status = statusConfig[person.locationStatus];

  return (
    <div
      className={cn(
        'card-tactical group cursor-pointer rounded-xl border-l-4 p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-glow',
        readinessColors[person.readinessStatus]
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Rank Badge */}
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-tactical font-mono text-sm font-bold text-primary-foreground shadow-tactical">
            {person.rank}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {person.lastName}, {person.firstName}
            </h3>
            <p className="text-sm text-muted-foreground">{person.dutyPosition}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="rank">{person.team}</Badge>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="font-mono text-xs text-muted-foreground">
                {person.serviceNumber}
              </span>
            </div>
          </div>
        </div>
        <Badge className={cn('shrink-0', status.className)}>{status.label}</Badge>
      </div>

      {/* Contact Info */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span className="truncate">{person.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span className="truncate">{person.email}</span>
        </div>
      </div>

      {/* Skills & Licenses */}
      <div className="mt-4 flex flex-wrap gap-2">
        {person.skills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="tactical" className="text-[10px]">
            <Award className="mr-1 h-3 w-3" />
            {skill}
          </Badge>
        ))}
        {person.driverLicenses.slice(0, 2).map((license) => (
          <Badge key={license} variant="secondary" className="text-[10px]">
            <Car className="mr-1 h-3 w-3" />
            {license}
          </Badge>
        ))}
      </div>

      {/* View Details */}
      <div className="mt-4 flex items-center justify-end text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
        View Profile
        <ChevronRight className="ml-1 h-4 w-4" />
      </div>
    </div>
  );
}
