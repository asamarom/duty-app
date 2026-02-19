import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Settings,
  Shield,
  LogOut,
  UserCheck,
  Building2,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  showBadge?: boolean;
}

export function Sidebar() {
  const { t, dir } = useLanguage();
  const { user, signOut } = useAuth();
  const { isAdmin, isLeader, isActualAdmin, isAdminMode } = useEffectiveRole();
  const { toggleAdminMode } = useAdminMode();
  const pendingCount = usePendingRequestsCount();

  const hasAdminAccess = isAdmin || isLeader;

  const navigation: NavItem[] = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package, showBadge: true },
    { name: t('nav.units'), href: '/units', icon: Building2 },
    { name: t('nav.reports'), href: '/reports', icon: ClipboardList },
  ];

  // Add approvals link for admins and leaders (respecting admin mode)
  if (hasAdminAccess) {
    navigation.push({ name: t('nav.approvals'), href: '/approvals', icon: UserCheck });

  }

  const bottomNavigation = [
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  return (
    <aside className={cn(
      "fixed top-0 z-40 h-screen w-64 border-border bg-sidebar",
      dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
    )}>
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-tactical">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">PMTB</h1>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {t('nav.platoonManagement')}
            </p>
          </div>
        </div>

        {/* Admin Mode Toggle - Only for admins */}
        {isActualAdmin && (
          <div className="mx-4 mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "rounded-lg border p-3 transition-all cursor-pointer",
                    isAdminMode
                      ? "border-primary/50 bg-primary/10"
                      : "border-muted bg-muted/30"
                  )}
                  onClick={toggleAdminMode}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isAdminMode ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        isAdminMode ? "text-primary" : "text-muted-foreground"
                      )}>
                        {isAdminMode ? t('adminMode.adminView') : t('adminMode.userView')}
                      </span>
                    </div>
                    <Switch
                      checked={isAdminMode}
                      onCheckedChange={toggleAdminMode}
                      className="scale-75"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isAdminMode ? t('adminMode.enabled') : t('adminMode.disabled')}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side={dir === 'rtl' ? 'left' : 'right'}>
                <p>{t('adminMode.description')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isActive ? 'text-sidebar-primary' : 'text-muted-foreground'
                      )}
                    />
                    {item.showBadge && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -end-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </div>
                  {item.name}
                  {isActive && (
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full bg-sidebar-primary",
                      dir === 'rtl' ? 'mr-auto' : 'ml-auto'
                    )} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-sidebar-border p-3">
          {bottomNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )
              }
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* User Info */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 font-mono text-xs font-bold text-primary">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title={t('nav.signOut')}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
