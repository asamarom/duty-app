import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Users,
  Package,
  ClipboardList,
  Settings,
  Shield,
  Radio,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const { t, dir } = useLanguage();
  const { user, signOut } = useAuth();

  const navigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.personnel'), href: '/personnel', icon: Users },
    { name: t('nav.equipment'), href: '/equipment', icon: Package },
    { name: t('nav.reports'), href: '/reports', icon: ClipboardList },
  ];

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
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Platoon Management
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mx-4 mt-4 rounded-lg border border-success/30 bg-success/10 p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
            <span className="text-xs font-medium text-success">{t('nav.systemOnline')}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Radio className="h-3 w-3" />
            <span>{t('settings.lastSync')}: 2 min ago</span>
          </div>
        </div>

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
                  <item.icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-sidebar-primary' : 'text-muted-foreground'
                    )}
                  />
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
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
