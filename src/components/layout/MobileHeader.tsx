import { Shield, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function MobileHeader({ title, subtitle, showBack, onBack }: MobileHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack ? (
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-tactical">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {title || 'PMTB'}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {!showBack && (
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-medium text-success hidden sm:inline">
              {t('nav.systemOnline')}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
