import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowLeftRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate, useLocation } from 'react-router-dom';

export function MobileNav() {
  const { t } = useLanguage();
  const { isAdmin, isLeader } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const mainNavigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package },
    { name: 'Transfers', href: '/assignment-requests', icon: ArrowLeftRight, adminOnly: true },
  ];

  const moreItems = [
    { name: 'Units', href: '/units' },
    { name: 'Approvals', href: '/approvals', adminOnly: true },
    { name: t('nav.reports'), href: '/reports' },
    { name: t('nav.settings'), href: '/settings' },
  ];

  const filteredMainNav = mainNavigation.filter(item => !item.adminOnly || isAdmin || isLeader);
  const filteredMoreItems = moreItems.filter(item => !item.adminOnly || isAdmin || isLeader);

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
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-2 rounded-xl transition-all',
                  isActive && 'bg-primary/20'
                )}>
                  <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
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
                More
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
