import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment } from '@/hooks/useEquipment';
import { Users, Package, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading } = useEquipment();

  const loading = personnelLoading || equipmentLoading;

  // Calculate stats from real data
  const totalPersonnel = personnel.length;
  const uniqueEquipmentIds = new Set(equipment.map(e => e.id.split('--')[0]));
  const totalEquipment = uniqueEquipmentIds.size;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={t('dashboard.title')}
          subtitle={new Date().toLocaleDateString()}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('dashboard.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dashboard.subtitle')} • {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-4 lg:mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
          <StatCard
            title={t('dashboard.totalPersonnel')}
            value={totalPersonnel}
            subtitle={t('dashboard.registered')}
            icon={Users}
            status="ready"
          />
          <StatCard
            title={t('dashboard.equipmentItems')}
            value={totalEquipment}
            subtitle={t('dashboard.tracked')}
            icon={Package}
            status="ready"
          />
        </section>

        {/* Personnel Overview */}
        <section>
          <div className="card-tactical rounded-xl p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('dashboard.personnelOverview')}</h3>
            </div>
            {personnel.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noPersonnel')}</p>
            ) : (
              <div className="space-y-2">
                {personnel.slice(0, 5).map((person) => (
                  <div key={person.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {person.firstName?.charAt(0)}{person.lastName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {person.rank} {person.firstName} {person.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {person.serviceNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {personnel.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{personnel.length - 5} more
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
