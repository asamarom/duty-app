import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';

export function ApprovalsTab() {
  const { t } = useLanguage();
  const { isAdmin } = useEffectiveRole();
  const navigate = useNavigate();
  const pendingCount = usePendingRequestsCount();

  if (!isAdmin) {
    return (
      <div className="space-y-4 mt-4">
        <Card className="card-tactical border-border/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('settings.adminOnlyFeature')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Pending Approvals */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-destructive/20">
              <UserCheck className="h-4 w-4 lg:h-5 lg:w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-base">{t('settings.pendingApprovals')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                {t('settings.reviewUserRequests')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs lg:text-sm text-foreground">
                  {t('settings.pendingRequests')}
                </span>
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/approvals')}
              >
                {t('common.view')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Permissions */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
              <ShieldCheck className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-base">{t('settings.adminPermissions')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                {t('settings.fullSystemAccess')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
          <ul className="space-y-2 text-xs lg:text-sm">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('settings.approveUsers')}</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('settings.assignRoles')}</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('settings.manageAllUnits')}</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{t('settings.systemConfiguration')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
