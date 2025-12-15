import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { dir } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <Sidebar />
      <main className={cn(
        "min-h-screen",
        dir === 'rtl' ? 'pr-64' : 'pl-64'
      )}>
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
