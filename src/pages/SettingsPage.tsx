import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lock,
  Users,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { t, language, setLanguage, dir } = useLanguage();

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
              Admin Access
            </Badge>
          </div>
        </header>

        <div className="space-y-4 lg:max-w-2xl">
          {/* Language Settings */}
          <Card className="card-tactical border-border/50">
            <CardHeader className="p-4 lg:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
                  <Globe className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm lg:text-base">{t('settings.language')}</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">
                    {t('settings.selectLanguage')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
              <Select value={language} onValueChange={(value: 'en' | 'he') => setLanguage(value)}>
                <SelectTrigger className="w-full bg-secondary border-border h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.english')}</SelectItem>
                  <SelectItem value="he">{t('settings.hebrew')}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card className="card-tactical border-border/50">
            <CardHeader className="p-4 lg:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-destructive/20">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-sm lg:text-base">{t('settings.accessControl')}</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">{t('approvals.role')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="rank" className="text-xs">ADMIN</Badge>
                    <span className="text-xs lg:text-sm text-foreground">{t('settings.fullAccess')}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="tactical" className="text-xs">LEADER</Badge>
                    <span className="text-xs lg:text-sm text-foreground">{t('settings.unitManagement')}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">USER</Badge>
                    <span className="text-xs lg:text-sm text-foreground">{t('settings.standardAccess')}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Info */}
          <Card className="card-tactical border-border/50">
            <CardContent className="p-4 lg:pt-6">
              <div className="text-center space-y-1">
                <p className="font-mono text-xs text-muted-foreground">PMTB v1.0.0</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
