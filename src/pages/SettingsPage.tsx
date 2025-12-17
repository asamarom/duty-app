import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  Shield,
  Bell,
  Database,
  Cloud,
  Lock,
  Users,
  RefreshCw,
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

        <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-y-0">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Language Settings - Mobile First */}
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

            {/* Unit Information */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="p-4 lg:p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Shield className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm lg:text-base">{t('settings.unitInfo')}</CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                      Basic unit identification
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs lg:text-sm">{t('settings.unitDesignation')}</Label>
                  <Input
                    defaultValue="2nd Platoon, Alpha Company"
                    className="bg-secondary border-border h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs lg:text-sm">{t('settings.unitName')}</Label>
                  <Input
                    defaultValue="1st Battalion, 501st Infantry Regiment"
                    className="bg-secondary border-border h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs lg:text-sm">{t('settings.homeStation')}</Label>
                  <Input
                    defaultValue="Fort Bragg, NC"
                    className="bg-secondary border-border h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="p-4 lg:p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-warning/20">
                    <Bell className="h-4 w-4 lg:h-5 lg:w-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-sm lg:text-base">{t('settings.notifications')}</CardTitle>
                    <CardDescription className="text-xs lg:text-sm">Configure alerts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{t('settings.alertsEnabled')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.receiveAlerts')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{t('settings.dailyDigest')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.dailySummary')}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Access Control - Simplified for Mobile */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="p-4 lg:p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-destructive/20">
                    <Users className="h-4 w-4 lg:h-5 lg:w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-sm lg:text-base">{t('settings.accessControl')}</CardTitle>
                    <CardDescription className="text-xs lg:text-sm">User roles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="rank" className="text-xs">ADMIN</Badge>
                      <span className="text-xs lg:text-sm text-foreground">PL / PSG</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="tactical" className="text-xs">LEADER</Badge>
                      <span className="text-xs lg:text-sm text-foreground">Squad Leaders</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">USER</Badge>
                      <span className="text-xs lg:text-sm text-foreground">Soldiers</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Stacks below on mobile */}
          <div className="space-y-4 lg:space-y-6">
            {/* Sync Status */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="p-4 lg:p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-success/20">
                    <Cloud className="h-4 w-4 lg:h-5 lg:w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="text-sm lg:text-base">{t('settings.syncStatus')}</CardTitle>
                    <CardDescription className="text-xs">Cloud sync</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Badge variant="success" className="text-xs">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('settings.lastSync')}</span>
                    <span className="text-xs text-foreground">2 min ago</span>
                  </div>
                  <Button variant="outline" className="w-full h-10">
                    <RefreshCw className="me-2 h-4 w-4" />
                    {t('settings.syncNow')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="card-tactical border-border/50">
              <CardHeader className="p-4 lg:p-6 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Database className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm lg:text-base">{t('settings.dataManagement')}</CardTitle>
                    <CardDescription className="text-xs">{t('settings.backupDesc')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0 space-y-2">
                <Button variant="outline" className="w-full justify-start h-10 text-sm">
                  {t('settings.exportData')}
                </Button>
                <Button variant="outline" className="w-full justify-start h-10 text-sm">
                  {t('settings.backupRestore')}
                </Button>
              </CardContent>
            </Card>

            {/* Version Info */}
            <Card className="card-tactical border-border/50">
              <CardContent className="p-4 lg:pt-6">
                <div className="text-center space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">PMTB v1.0.0</p>
                  <Badge variant="outline" className="text-xs">
                    Build 2024.01.15
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
