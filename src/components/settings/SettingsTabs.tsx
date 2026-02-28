import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { ProfileTab } from './ProfileTab';
import { UnitsTab } from './UnitsTab';
import { ApprovalsTab } from './ApprovalsTab';

export function SettingsTabs() {
  const { t } = useLanguage();
  const { isAdmin, isLeader } = useEffectiveRole();

  const showUnitsTab = isAdmin || isLeader;
  const showApprovalsTab = isAdmin;

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList aria-label={t('settings.tabs')} className="grid w-full grid-cols-3">
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
