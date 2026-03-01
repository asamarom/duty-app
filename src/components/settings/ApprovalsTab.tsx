import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { ShieldCheck, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApprovalsSheet } from './ApprovalsSheet';
import { usePendingRequestsCount } from '@/hooks/usePendingRequestsCount';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useAuth } from '@/hooks/useAuth';

export function ApprovalsTab() {
  const { t } = useLanguage();
  const { isAdmin } = useEffectiveRole();
  const { user } = useAuth();
  const pendingCount = usePendingRequestsCount();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [loadingApproved, setLoadingApproved] = useState(true);

  // Fetch approved count in user's unit
  useEffect(() => {
    const fetchApprovedCount = async () => {
      if (!isAdmin || !user) {
        setLoadingApproved(false);
        return;
      }

      try {
        setLoadingApproved(true);

        // Get user's personnel record to find their unit
        const personnelQuery = query(
          collection(db, 'personnel'),
          where('userId', '==', user.uid)
        );
        const personnelSnap = await getDocs(personnelQuery);

        let userUnitId = null;
        if (!personnelSnap.empty) {
          const personnelData = personnelSnap.docs[0].data();
          userUnitId = personnelData.unitId || personnelData.battalionId;
        }

        // Get approved requests count
        const requestsQuery = query(
          collection(db, 'signupRequests'),
          where('status', '==', 'approved')
        );
        const requestsSnap = await getDocs(requestsQuery);

        // If we have a unit, filter by it; otherwise show all
        let count = requestsSnap.size;
        if (userUnitId) {
          count = requestsSnap.docs.filter(doc => {
            const data = doc.data();
            return data.requestedUnitId === userUnitId;
          }).length;
        }

        setApprovedCount(count);
      } catch (error) {
        console.error('Error fetching approved count:', error);
        setApprovedCount(null);
      } finally {
        setLoadingApproved(false);
      }
    };

    fetchApprovedCount();
  }, [isAdmin, user]);

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
      {/* Pending Approvals Summary */}
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
            {/* Pending Count */}
            <div className="rounded-lg border border-border/50 bg-secondary/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {t('settings.pendingRequests')}
                </span>
                {pendingCount > 0 ? (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {t('settings.pendingCount', { count: pendingCount.toString() })}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground text-right">
                    {t('settings.noPendingRequests')}
                  </span>
                )}
              </div>

              {/* Approved Count */}
              <div className="mt-2 pt-2 border-t border-border/30">
                {loadingApproved ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t('common.loading')}
                    </span>
                  </div>
                ) : approvedCount !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {approvedCount} {t('settings.approvedInYourUnit')}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Manage Approvals Button */}
            <Button
              className="w-full"
              onClick={() => setIsSheetOpen(true)}
            >
              {t('settings.manageApprovals')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Permissions Card */}
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

      {/* Approvals Sheet */}
      <ApprovalsSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}
