import { Personnel, LocationStatus } from '@/types/pmtb';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';

interface PersonnelStatusListProps {
  personnel: Personnel[];
  limit?: number;
}

const statusVariants: Record<LocationStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  on_duty: 'success',
  active_mission: 'warning',
  home: 'secondary',
  off_duty: 'secondary',
  leave: 'secondary',
  tdy: 'secondary',
};

const statusLabelKeys: Record<LocationStatus, TranslationKey> = {
  on_duty: 'status.onDuty',
  active_mission: 'status.activeMission',
  home: 'status.home',
  off_duty: 'status.offDuty',
  leave: 'status.leave',
  tdy: 'status.tdy',
};

export function PersonnelStatusList({ personnel, limit }: PersonnelStatusListProps) {
  const { t } = useLanguage();
  const displayedPersonnel = limit ? personnel.slice(0, limit) : personnel;

  return (
    <div className="space-y-2">
      {displayedPersonnel.map((person, index) => {
        const variant = statusVariants[person.locationStatus];
        const labelKey = statusLabelKeys[person.locationStatus];
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
                {person.dutyPosition}
              </p>
            </div>

            {/* Status */}
            <Badge
              variant={variant}
              className={cn(
                'shrink-0',
                variant === 'success' && 'status-ready',
                variant === 'warning' && 'status-warning',
                variant === 'destructive' && 'status-critical'
              )}
            >
              {t(labelKey)}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
