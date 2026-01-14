import { Personnel } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Phone, Mail, Award, Car, ChevronRight } from 'lucide-react';
import { RoleBadges } from './RoleBadge';
import type { AppRole } from '@/hooks/useUserRole';

interface PersonnelCardProps {
  person: Personnel;
  onClick?: () => void;
  roles?: AppRole[];
}

export function PersonnelCard({ person, onClick, roles = [] }: PersonnelCardProps) {
  return (
    <div
      className={cn(
        'card-tactical group cursor-pointer rounded-xl p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-glow'
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {person.lastName}, {person.firstName}
              </h3>
              <RoleBadges roles={roles} size="sm" />
            </div>
            <p className="text-sm font-medium text-primary">{person.dutyPosition}</p>
            <span className="font-mono text-xs text-muted-foreground">
              {person.serviceNumber}
            </span>
          </div>
        </div>
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
