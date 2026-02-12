import { cn } from '@/lib/utils';

interface ReadinessGaugeProps {
  percentage: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ReadinessGauge({
  percentage,
  label,
  size = 'md',
}: ReadinessGaugeProps) {
  const sizes = {
    sm: { container: 'h-20 w-20 lg:h-24 lg:w-24', text: 'text-lg lg:text-xl', label: 'text-[9px] lg:text-xs' },
    md: { container: 'h-24 w-24 lg:h-32 lg:w-32', text: 'text-2xl lg:text-3xl', label: 'text-xs lg:text-xs' },
    lg: { container: 'h-28 w-28 lg:h-40 lg:w-40', text: 'text-3xl lg:text-4xl', label: 'text-xs lg:text-sm' },
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 85) return 'stroke-success';
    if (percentage >= 70) return 'stroke-warning';
    return 'stroke-destructive';
  };

  const getTextColor = () => {
    if (percentage >= 85) return 'text-success';
    if (percentage >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={cn('relative', sizes[size].container)}>
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={cn('transition-all duration-1000 ease-out', getColor())}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('font-bold tracking-tight', sizes[size].text, getTextColor())}
          >
            {percentage}%
          </span>
        </div>
      </div>
      <span
        className={cn(
          'mt-1.5 lg:mt-2 font-medium uppercase tracking-wider text-muted-foreground text-center max-w-[80px] lg:max-w-none leading-tight',
          sizes[size].label
        )}
      >
        {label}
      </span>
    </div>
  );
}
