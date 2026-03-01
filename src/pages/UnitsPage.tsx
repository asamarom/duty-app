import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { UnitsManagement } from '@/components/units/UnitsManagement';
import { useLanguage } from '@/contexts/LanguageContext';

export default function UnitsPage() {
  const { t } = useLanguage();

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader title={t('units.title')} subtitle={t('units.manageStructure')} />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        <UnitsManagement showHeader showAddButton />
      </div>
    </MainLayout>
  );
}
