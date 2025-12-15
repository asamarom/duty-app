import { MainLayout } from '@/components/layout/MainLayout';
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

const reportTypes = [
  {
    id: 'daily',
    title: 'Daily Status Report',
    description: 'Daily personnel accountability and status updates',
    icon: Calendar,
    frequency: 'Daily',
    lastSubmitted: '2024-01-15 0600',
    status: 'pending',
  },
  {
    id: 'personnel',
    title: 'Personnel Strength Report',
    description: 'Complete roster with qualifications and assignments',
    icon: Users,
    frequency: 'Weekly',
    lastSubmitted: '2024-01-14',
    status: 'submitted',
  },
  {
    id: 'equipment',
    title: 'Equipment Status Report',
    description: 'Full property accountability and serviceability',
    icon: Package,
    frequency: 'Weekly',
    lastSubmitted: '2024-01-14',
    status: 'submitted',
  },
  {
    id: 'readiness',
    title: 'Readiness Assessment',
    description: 'Comprehensive unit readiness evaluation',
    icon: TrendingUp,
    frequency: 'Monthly',
    lastSubmitted: '2024-01-01',
    status: 'submitted',
  },
];

export default function ReportsPage() {
  return (
    <MainLayout>
      <div className="tactical-grid min-h-screen p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Reports & Documentation
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate, submit, and track platoon reports
              </p>
            </div>
            <Button variant="tactical">
              <FileText className="mr-2 h-4 w-4" />
              New Report
            </Button>
          </div>
        </header>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="card-tactical flex items-center gap-4 rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/20">
              <ClipboardList className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Submit Daily Report</h3>
              <p className="text-sm text-muted-foreground">Due today at 0800</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </div>
          <div className="card-tactical flex items-center gap-4 rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Export Roster</h3>
              <p className="text-sm text-muted-foreground">PDF or Excel format</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </div>
          <div className="card-tactical flex items-center gap-4 rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/20">
              <Package className="h-6 w-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Property Book</h3>
              <p className="text-sm text-muted-foreground">Generate hand receipts</p>
            </div>
            <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {/* Report Types */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Report Templates</h2>
          <p className="text-sm text-muted-foreground">
            Standard reports and documentation
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reportTypes.map((report, index) => (
            <Card
              key={report.id}
              className="card-tactical border-border/50 transition-all hover:border-primary/30 animate-slide-up cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={report.status === 'pending' ? 'warning' : 'success'}
                    className="capitalize"
                  >
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Frequency: <span className="text-foreground">{report.frequency}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Last: <span className="text-foreground">{report.lastSubmitted}</span>
                    </span>
                  </div>
                  <Button variant="ghost" size="sm">
                    Generate
                    <ChevronRight className="ml-1 h-4 w-4" />
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
