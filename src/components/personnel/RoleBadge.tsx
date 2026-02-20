import { Badge } from '@/components/ui/badge';
import { Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/hooks/useUserRole';
import { useLanguage } from '@/contexts/LanguageContext';

interface RoleBadgeProps {
  role: AppRole;
  size?: 'sm' | 'default';
  className?: string;
}

const roleIcons: Record<AppRole, typeof Shield> = {
  admin: Shield,
  leader: Crown,
  user: Shield,
};

const roleClassNames: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
  leader: 'bg-warning/10 text-warning border-warning/30',
  user: 'bg-muted text-muted-foreground border-border',
};

export function RoleBadge({ role, size = 'default', className }: RoleBadgeProps) {
  const { t } = useLanguage();

  const roleLabelKeys: Record<AppRole, Parameters<typeof t>[0]> = {
    admin: 'personnel.roleAdmin',
    leader: 'personnel.roleLeader',
    user: 'personnel.roleUser',
  };

  const Icon = roleIcons[role];

  // Don't show badge for regular users
  if (role === 'user') return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        roleClassNames[role],
        size === 'sm' && 'text-xs px-1.5 py-0',
        className
      )}
    >
      <Icon className={cn('me-1', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {t(roleLabelKeys[role])}
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
