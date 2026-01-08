import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowLeftRight,
  MoreHorizontal,
  ShieldCheck,
  User,
  LogOut,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useLocation } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';

export function MobileNav() {
  const { t } = useLanguage();
  const { isAdmin, isLeader, isActualAdmin } = useUserRole();
  const { isAdminMode, toggleAdminMode } = useAdminMode();
  const { signOut } = useAuth();
  const pendingCount = usePendingRequestsCount();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine effective admin/leader status based on admin mode
  // Admin mode only affects admin privileges; leader privileges remain.
  const effectiveIsAdmin = isActualAdmin && isAdminMode;
  const effectiveIsLeader = isLeader;
  const hasAdminAccess = effectiveIsAdmin || effectiveIsLeader;

  const mainNavigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package },
    { name: t('nav.transfers'), href: '/assignment-requests', icon: ArrowLeftRight, adminOnly: true, showBadge: true },
  ];

  const moreItems = [
    { name: t('nav.units'), href: '/units' },
    { name: t('nav.approvals'), href: '/approvals', adminOnly: true },
    { name: t('nav.reports'), href: '/reports' },
    { name: t('nav.settings'), href: '/settings' },
  ];

  const filteredMainNav = mainNavigation.filter(item => !item.adminOnly || hasAdminAccess);
  const filteredMoreItems = moreItems.filter(item => !item.adminOnly || hasAdminAccess);

  const isMoreActive = filteredMoreItems.some(item => location.pathname === item.href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {filteredMainNav.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-2 rounded-xl transition-all relative',
                  isActive && 'bg-primary/20'
                )}>
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {item.showBadge && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive && 'text-primary'
                )}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]',
                isMoreActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                'p-2 rounded-xl transition-all',
                isMoreActive && 'bg-primary/20'
              )}>
                <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'text-primary')} />
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isMoreActive && 'text-primary'
              )}>
                {t('nav.more')}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            {isActualAdmin && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between gap-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-2">
                    {isAdminMode ? (
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isAdminMode ? 'text-primary' : ''}>
                      {isAdminMode ? t('adminMode.adminView') : t('adminMode.userView')}
                    </span>
                  </div>
                  <Switch
                    checked={isAdminMode}
                    onCheckedChange={toggleAdminMode}
                    className="scale-75"
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {filteredMoreItems.map((item) => (
              <DropdownMenuItem
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  location.pathname === item.href && 'bg-primary/10 text-primary'
                )}
              >
                {item.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 me-2" />
              {t('nav.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
