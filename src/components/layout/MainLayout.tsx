import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { dir } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main className={cn(
        "min-h-screen pb-24 lg:pb-0",
        dir === 'rtl' ? 'lg:pr-64' : 'lg:pl-64'
      )}>
        <div className="min-h-screen">{children}</div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
