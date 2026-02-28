import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { ProfileTab } from './ProfileTab';
import { UnitsTab } from './UnitsTab';
import { ApprovalsTab } from './ApprovalsTab';

export function SettingsTabs() {
  const { t } = useLanguage();
  const { isAdmin, isLeader, loading } = useEffectiveRole();

  const showUnitsTab = isAdmin || isLeader;
  const showApprovalsTab = isAdmin;

  // Calculate number of visible tabs
  const tabCount = 1 + (showUnitsTab ? 1 : 0) + (showApprovalsTab ? 1 : 0);
  const gridColsClass = tabCount === 1 ? 'grid-cols-1' : tabCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  // Show loading state while roles are being fetched
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList aria-label={t('settings.tabs')} className={`grid w-full ${gridColsClass}`}>
        <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
        {showUnitsTab && <TabsTrigger value="units">{t('settings.units')}</TabsTrigger>}
        {showApprovalsTab && <TabsTrigger value="approvals">{t('settings.approvals')}</TabsTrigger>}
      </TabsList>
      <TabsContent value="profile">
        <ProfileTab />
      </TabsContent>
      {showUnitsTab && (
        <TabsContent value="units">
          <UnitsTab />
        </TabsContent>
      )}
      {showApprovalsTab && (
        <TabsContent value="approvals">
          <ApprovalsTab />
        </TabsContent>
      )}
    </Tabs>
  );
}
