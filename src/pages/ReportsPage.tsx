import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardList,
  FileText,
  Calendar,
  Download,
  ChevronRight,
  Users,
  Package,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportsPage() {
  const { t, dir } = useLanguage();

  const reportTypes = [
    {
      id: 'daily',
      title: t('reports.dailyPersonnel'),
      description: t('reports.dailyPersonnelDesc'),
      icon: Calendar,
      frequency: 'Daily',
      lastSubmitted: '2024-01-15 0600',
      status: 'pending',
    },
    {
      id: 'personnel',
      title: t('reports.weeklyReadiness'),
      description: t('reports.weeklyReadinessDesc'),
      icon: Users,
      frequency: 'Weekly',
      lastSubmitted: '2024-01-14',
      status: 'submitted',
    },
    {
      id: 'equipment',
      title: t('reports.equipmentStatus'),
      description: t('reports.equipmentStatusDesc'),
      icon: Package,
      frequency: 'Weekly',
      lastSubmitted: '2024-01-14',
      status: 'submitted',
    },
    {
      id: 'readiness',
      title: t('reports.trainingRecord'),
      description: t('reports.trainingRecordDesc'),
      icon: TrendingUp,
      frequency: 'Monthly',
      lastSubmitted: '2024-01-01',
      status: 'submitted',
    },
  ];

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader 
          title={t('reports.title')} 
          subtitle={t('reports.subtitle')}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('reports.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('reports.subtitle')}
              </p>
            </div>
            <Button variant="tactical">
              <FileText className="me-2 h-4 w-4" />
              New Report
            </Button>
          </div>
        </header>

        {/* Quick Actions - Mobile Optimized */}
        <div className="mb-6 lg:mb-8 space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
          <div className="card-tactical flex items-center gap-4 rounded-xl p-4 lg:p-5 cursor-pointer transition-all active:scale-[0.98] hover:border-primary/50">
            <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-warning/20">
              <ClipboardList className="h-5 w-5 lg:h-6 lg:w-6 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm lg:text-base">{t('reports.submitDaily')}</h3>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">{t('reports.recordStatus')}</p>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </div>
          <div className="card-tactical flex items-center gap-4 rounded-xl p-4 lg:p-5 cursor-pointer transition-all active:scale-[0.98] hover:border-primary/50">
            <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-primary/20">
              <Download className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm lg:text-base">{t('reports.generateReadiness')}</h3>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">{t('reports.compileStatus')}</p>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </div>
          <div className="card-tactical flex items-center gap-4 rounded-xl p-4 lg:p-5 cursor-pointer transition-all active:scale-[0.98] hover:border-primary/50">
            <div className="flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl bg-success/20">
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm lg:text-base">{t('reports.equipmentAudit')}</h3>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">{t('reports.verifyInventory')}</p>
            </div>
            <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Report Types */}
        <div className="mb-4">
          <h2 className="text-base lg:text-lg font-semibold text-foreground">{t('reports.reportTemplates')}</h2>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Standard reports and documentation
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:gap-4 lg:grid-cols-2">
          {reportTypes.map((report, index) => (
            <Card
              key={report.id}
              className="card-tactical border-border/50 transition-all active:scale-[0.99] hover:border-primary/30 animate-slide-up cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-2 lg:pb-3 p-4 lg:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
                      <report.icon className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm lg:text-base truncate">{report.title}</CardTitle>
                      <CardDescription className="text-xs truncate">{report.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={report.status === 'pending' ? 'warning' : 'success'}
                    className="capitalize text-xs shrink-0"
                  >
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
                <div className="flex items-center justify-between text-xs lg:text-sm">
                  <div className="flex items-center gap-2 lg:gap-4 text-muted-foreground">
                    <span>{report.frequency}</span>
                    <span className="text-foreground">{report.lastSubmitted}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-8">
                    {t('reports.generate')}
                    <ChevronRight className={`h-3 w-3 lg:h-4 lg:w-4 ${dir === 'rtl' ? 'me-1 rotate-180' : 'ms-1'}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
