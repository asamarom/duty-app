import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/hooks/useUserRole';

interface RoleBadgeProps {
  role: AppRole;
  size?: 'sm' | 'default';
  className?: string;
}

const roleConfig: Record<AppRole, { icon: typeof Shield; label: string; className: string }> = {
  admin: {
    icon: Shield,
    label: 'Admin',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  leader: {
    icon: Crown,
    label: 'Leader',
    className: 'bg-warning/10 text-warning border-warning/30',
  },
  user: {
    icon: Shield,
    label: 'User',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function RoleBadge({ role, size = 'default', className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;
  
  // Don't show badge for regular users
  if (role === 'user') return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium',
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0',
        className
      )}
    >
      <Icon className={cn('mr-1', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {config.label}
    </Badge>
  );
}

interface RoleBadgesProps {
  roles: AppRole[];
  size?: 'sm' | 'default';
  className?: string;
}

export function RoleBadges({ roles, size = 'default', className }: RoleBadgesProps) {
  // Filter out 'user' role and show only admin/leader
  const significantRoles = roles.filter(r => r !== 'user');
  
  if (significantRoles.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {significantRoles.map(role => (
        <RoleBadge key={role} role={role} size={size} />
      ))}
    </div>
  );
}
