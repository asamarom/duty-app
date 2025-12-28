import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ReadinessGauge } from '@/components/dashboard/ReadinessGauge';
import { PersonnelStatusList } from '@/components/dashboard/PersonnelStatusList';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment } from '@/hooks/useEquipment';
import { Users, Package, AlertTriangle, Target, Calendar, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading } = useEquipment();

  const loading = personnelLoading || equipmentLoading;

  // Calculate stats from real data
  const totalPersonnel = personnel.length;
  const readyPersonnel = personnel.filter(p => p.readinessStatus === 'ready').length;
  const onMission = personnel.filter(p => p.locationStatus === 'active_mission').length;
  const onLeave = personnel.filter(p => p.locationStatus === 'leave').length;
  const totalEquipment = equipment.length;
  const serviceableEquipment = equipment.length; // All equipment from DB is serviceable by default

  const readyPercentage = totalPersonnel > 0 ? Math.round((readyPersonnel / totalPersonnel) * 100) : 0;
  const equipmentPercentage = totalEquipment > 0 ? Math.round((serviceableEquipment / totalEquipment) * 100) : 0;

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Calendar className="me-2 h-4 w-4" />
                {t('reports.submitDaily')}
              </Button>
              <Button variant="tactical" size="sm">
                <Shield className="me-2 h-4 w-4" />
                {t('reports.quickActions')}
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Quick Actions */}
        <div className="lg:hidden mb-4 flex gap-2">
          <Button variant="tactical" size="sm" className="flex-1">
            <Calendar className="me-2 h-4 w-4" />
            {t('reports.submitDaily')}
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Shield className="me-2 h-4 w-4" />
            {t('reports.quickActions')}
          </Button>
        </div>

        {/* Readiness Overview - Mobile Optimized */}
        <section className="mb-4 lg:mb-8">
          <div className="card-tactical rounded-xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base lg:text-lg font-semibold text-foreground">
                {t('dashboard.readinessLevel')}
              </h2>
              <Badge variant="success" className="px-2 lg:px-4 py-1 text-xs">
                {t('dashboard.operational').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-around gap-2">
              <ReadinessGauge percentage={readyPercentage} label={t('dashboard.totalPersonnel')} size="sm" />
              <ReadinessGauge percentage={equipmentPercentage} label={t('dashboard.equipmentItems')} size="sm" />
              <ReadinessGauge percentage={92} label="Training" size="sm" />
            </div>
          </div>
        </section>

        {/* Stats Grid - Mobile Optimized */}
        <section className="mb-4 lg:mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            title={t('dashboard.totalPersonnel')}
            value={totalPersonnel}
            subtitle={`${readyPersonnel} ${t('dashboard.assigned')}`}
            icon={Users}
            status="ready"
          />
          <StatCard
            title={t('dashboard.onMission')}
            value={onMission}
            subtitle={t('dashboard.deployed')}
            icon={Target}
            status="warning"
          />
          <StatCard
            title={t('dashboard.equipmentItems')}
            value={totalEquipment}
            subtitle={`${serviceableEquipment} ${t('dashboard.tracked')}`}
            icon={Package}
            status="ready"
          />
          <StatCard
            title="Certs Due"
            value={0}
            subtitle="Next 30 days"
            icon={AlertTriangle}
            status="ready"
          />
        </section>

        {/* Personnel Status & Alerts - Stack on Mobile */}
        <section className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-2">
          {/* Personnel Status */}
          <div className="card-tactical rounded-xl p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('dashboard.personnelStatus')}</h3>
              <Button variant="ghost" size="sm" className="text-primary text-xs">
                {t('common.view')}
              </Button>
            </div>
            <PersonnelStatusList personnel={personnel} limit={4} />
          </div>

          {/* Alerts & Notifications */}
          <div className="card-tactical rounded-xl p-4 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('dashboard.alerts')}</h3>
              <Badge variant="warning" className="text-xs">3</Badge>
            </div>
            <div className="space-y-2 lg:space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="font-medium text-warning text-sm">License Expiration</p>
                  <p className="text-xs text-muted-foreground truncate">
                    PFC Park's HMMWV license expires in 7 days
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <Package className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="font-medium text-destructive text-sm">Equipment Issue</p>
                  <p className="text-xs text-muted-foreground truncate">
                    AN/PRC-117G reported unserviceable
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                <Calendar className="mt-0.5 h-4 w-4 lg:h-5 lg:w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium text-primary text-sm">Scheduled Event</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Equipment inventory due in 3 days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
