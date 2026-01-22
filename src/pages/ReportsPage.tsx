import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportsPage() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={t('reports.title')}
          subtitle={t('reports.subtitle')}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('reports.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('reports.subtitle')}
            </p>
          </div>
        </header>

        {/* Coming Soon Placeholder */}
        <Card className="card-tactical border-border/50">
          <CardContent className="p-8 lg:p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{t('reports.comingSoon')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('reports.comingSoonDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
