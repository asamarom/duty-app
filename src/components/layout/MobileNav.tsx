import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePendingTransfersCount } from '@/hooks/usePendingTransfersCount';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Settings,
} from 'lucide-react';

export function MobileNav() {
  const { t } = useLanguage();
  const { totalCount: transfersCount } = usePendingTransfersCount();

  const navigation: { name: string; href: string; icon: typeof LayoutDashboard }[] = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package },
    { name: t('nav.reports'), href: '/reports', icon: ClipboardList },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[72px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'p-3 rounded-xl transition-all',
                  isActive && 'bg-primary/20'
                )}>
                  <item.icon className={cn('h-6 w-6', isActive && 'text-primary')} />
                </div>
                <span className={cn(
                  'text-xs font-medium flex items-center gap-1',
                  isActive && 'text-primary'
                )}>
                  {item.name}
                  {item.href === '/equipment' && transfersCount > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                      {transfersCount}
                    </Badge>
                  )}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
