import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { getFullVersionString } from '@/lib/version';

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={t('settings.title')}
          subtitle={t('settings.subtitle')}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('settings.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('settings.subtitle')}
              </p>
            </div>
            <Badge variant="tactical" className="px-3 py-1">
              <Lock className="me-1 h-3 w-3" />
              {t('settings.adminAccess')}
            </Badge>
          </div>
        </header>

        <div className="space-y-6 lg:max-w-4xl">
          {/* Settings Tabs */}
          <SettingsTabs />

          {/* Version Info */}
          <div className="text-center py-4">
            <p className="font-mono text-xs text-muted-foreground">
              {getFullVersionString()}
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
