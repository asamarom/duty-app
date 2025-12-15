import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ReadinessGauge } from '@/components/dashboard/ReadinessGauge';
import { PersonnelStatusList } from '@/components/dashboard/PersonnelStatusList';
import { mockPersonnel, mockPlatoonStats } from '@/data/mockData';
import { Users, Package, AlertTriangle, Target, Calendar, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Dashboard() {
  const { t } = useLanguage();
  
  const readyPercentage = Math.round(
    (mockPlatoonStats.readyPersonnel / mockPlatoonStats.totalPersonnel) * 100
  );
  const equipmentPercentage = Math.round(
    (mockPlatoonStats.equipmentServiceable / mockPlatoonStats.equipmentTotal) * 100
  );

  return (
    <MainLayout>
      <div className="tactical-grid min-h-screen p-6">
        {/* Header */}
        <header className="mb-8">
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

        {/* Readiness Overview */}
        <section className="mb-8">
          <div className="card-tactical rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t('dashboard.readinessLevel')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.subtitle')}
                </p>
              </div>
              <Badge variant="success" className="px-4 py-1">
                {t('dashboard.operational').toUpperCase()}
              </Badge>
            </div>
            <div className="mt-6 flex items-center justify-around">
              <ReadinessGauge percentage={readyPercentage} label={t('dashboard.totalPersonnel')} size="lg" />
              <ReadinessGauge percentage={equipmentPercentage} label={t('dashboard.equipmentItems')} size="lg" />
              <ReadinessGauge percentage={92} label="Training Current" size="lg" />
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('dashboard.totalPersonnel')}
            value={mockPlatoonStats.totalPersonnel}
            subtitle={`${mockPlatoonStats.readyPersonnel} ${t('dashboard.assigned')}`}
            icon={Users}
            status="ready"
          />
          <StatCard
            title={t('dashboard.onMission')}
            value={mockPlatoonStats.onMission}
            subtitle={t('dashboard.deployed')}
            icon={Target}
            status="warning"
          />
          <StatCard
            title={t('dashboard.equipmentItems')}
            value={mockPlatoonStats.equipmentTotal}
            subtitle={`${mockPlatoonStats.equipmentServiceable} ${t('dashboard.tracked')}`}
            icon={Package}
            status="ready"
          />
          <StatCard
            title="Certs Due"
            value={mockPlatoonStats.certificationsDue}
            subtitle="Next 30 days"
            icon={AlertTriangle}
            status={mockPlatoonStats.certificationsDue > 5 ? 'critical' : 'warning'}
          />
        </section>

        {/* Personnel Status & Alerts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Personnel Status */}
          <div className="card-tactical rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('dashboard.personnelStatus')}</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                {t('common.view')}
              </Button>
            </div>
            <PersonnelStatusList personnel={mockPersonnel} limit={5} />
          </div>

          {/* Alerts & Notifications */}
          <div className="card-tactical rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{t('dashboard.alerts')}</h3>
              <Badge variant="warning">3 Active</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning">License Expiration</p>
                  <p className="text-sm text-muted-foreground">
                    PFC Park's HMMWV license expires in 7 days
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Equipment Issue</p>
                  <p className="text-sm text-muted-foreground">
                    AN/PRC-117G reported unserviceable
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-primary">Scheduled Event</p>
                  <p className="text-sm text-muted-foreground">
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
