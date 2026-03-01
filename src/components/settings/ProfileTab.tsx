import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Globe, User, ShieldCheck, UserCog, Calendar, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getAppVersion } from '@/lib/version';
import { useAdminMode } from '@/contexts/AdminModeContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { cn } from '@/lib/utils';
import { useCurrentPersonnel } from '@/hooks/useCurrentPersonnel';
import { useUserBattalion } from '@/hooks/useUserBattalion';
import { useUnits } from '@/hooks/useUnits';
import { useMemo } from 'react';

export function ProfileTab() {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const { isAdminMode, toggleAdminMode } = useAdminMode();
  const { isActualAdmin, actualRoles } = useEffectiveRole();
  const { currentPersonnel } = useCurrentPersonnel();
  const { unitId } = useUserBattalion();
  const { getUnitById } = useUnits();

  // Get unit information
  const userUnit = useMemo(() => {
    if (!unitId) return null;
    return getUnitById(unitId);
  }, [unitId, getUnitById]);

  // Format account creation date
  const accountCreatedDate = useMemo(() => {
    if (!user?.metadata?.creationTime) return null;
    return new Date(user.metadata.creationTime).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [user?.metadata?.creationTime, language]);

  // Get user role badges
  const roleBadges = useMemo(() => {
    const badges = [];
    if (actualRoles.includes('admin')) badges.push({ label: t('personnel.roleAdmin'), variant: 'default' as const });
    if (actualRoles.includes('leader')) badges.push({ label: t('personnel.roleLeader'), variant: 'secondary' as const });
    if (actualRoles.includes('user') || actualRoles.length === 0) badges.push({ label: t('personnel.roleUser'), variant: 'outline' as const });
    return badges;
  }, [actualRoles, t]);

  return (
    <div className="space-y-4 mt-4">
      {/* User Info */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
              <User className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardDescription className="text-xs sm:text-sm font-medium text-foreground truncate">
                {user?.email || t('common.notAvailable')}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">{t('common.authenticated')}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* User Roles */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
              <UserCog className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-base">{t('settings.currentRole')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                {t('settings.accessLevel')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
          <div className="flex flex-wrap gap-2">
            {roleBadges.map((badge, index) => (
              <Badge key={index} variant={badge.variant} className="text-xs sm:text-sm">
                {badge.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
              <Calendar className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-base">{t('profile.accountInfo')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                {t('profile.accountDetails')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
          <div className="space-y-2 text-xs lg:text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t('profile.accountCreated')}</span>
              <span className="font-medium text-right">{accountCreatedDate || t('common.notAvailable')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t('profile.accountStatus')}</span>
              <Badge variant="outline" className="h-5 shrink-0 text-xs">{t('profile.active')}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Assignment */}
      {currentPersonnel && (
        <Card className="card-tactical border-border/50">
          <CardHeader className="p-4 lg:p-6 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
                <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm lg:text-base">{t('profile.unitAssignment')}</CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  {t('profile.linkedPersonnel')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
            <div className="space-y-2 text-xs lg:text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t('profile.personnelRecord')}</span>
                <Badge variant="secondary" className="shrink-0 text-xs">{t('common.linked')}</Badge>
              </div>
              {userUnit && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground shrink-0">{t('profile.assignedUnit')}</span>
                  <span className="font-medium text-right truncate">{userUnit.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Mode Toggle - Only for admins */}
      {isActualAdmin && (
        <Card className={cn(
          "card-tactical border-border/50 transition-all",
          isAdminMode ? "border-primary/50 bg-primary/5" : ""
        )}>
          <CardHeader className="p-4 lg:p-6 pb-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg transition-colors",
                isAdminMode ? "bg-primary/20" : "bg-muted"
              )}>
                <ShieldCheck className={cn(
                  "h-4 w-4 lg:h-5 lg:w-5 transition-colors",
                  isAdminMode ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm lg:text-base">
                  {t('adminMode.title')}
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  {isAdminMode ? t('adminMode.adminView') : t('adminMode.userView')}
                </CardDescription>
              </div>
              <Switch
                checked={isAdminMode}
                onCheckedChange={toggleAdminMode}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
            <p className="text-xs text-muted-foreground">
              {t('adminMode.description')}
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Version Info */}
      <Card className="card-tactical border-border/50">
        <CardContent className="p-4 lg:pt-6">
          <div className="text-center space-y-1">
            <p className="font-mono text-xs text-muted-foreground">
              {t('settings.version')}: {getAppVersion()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
