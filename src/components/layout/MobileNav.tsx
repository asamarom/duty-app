import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Building2,
  Settings,
} from 'lucide-react';

export function MobileNav() {
  const { t } = useLanguage();

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package },
    { name: 'Units', href: '/units', icon: Building2 },
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
      </div>
    </nav>
  );
}
