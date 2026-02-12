import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  status?: 'ready' | 'warning' | 'critical';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status = 'ready',
  className,
}: StatCardProps) {
  const statusColors = {
    ready: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    critical: 'border-destructive/30 bg-destructive/5',
  };

  const iconColors = {
    ready: 'text-success bg-success/20',
    warning: 'text-warning bg-warning/20',
    critical: 'text-destructive bg-destructive/20',
  };

  return (
    <div
      className={cn(
        'card-tactical rounded-xl p-3 lg:p-5 transition-all duration-300 active:scale-[0.98] hover:border-primary/30',
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          <p className="mt-1 lg:mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 lg:mt-1 text-xs lg:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                'mt-1 lg:mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs lg:text-xs font-medium',
                trend.positive
                  ? 'bg-success/20 text-success'
                  : 'bg-destructive/20 text-destructive'
              )}
            >
              {trend.positive ? '+' : ''}
              {trend.value}%
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 lg:h-12 lg:w-12 items-center justify-center rounded-xl shrink-0',
            iconColors[status]
          )}
        >
          <Icon className="h-4 w-4 lg:h-6 lg:w-6" />
        </div>
      </div>
    </div>
  );
}
