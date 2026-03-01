import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useUnitsManagement } from '@/hooks/useUnitsManagement';
import { Building2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UnitsSheet } from './UnitsSheet';

export function UnitsTab() {
  const { t } = useLanguage();
  const { isAdmin, isLeader } = useEffectiveRole();
  const { battalions, companies, platoons, loading } = useUnitsManagement();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const canManageUnits = isAdmin || isLeader;

  // Calculate battalion-scoped counts
  const battalionCount = battalions.length;
  const companyCount = companies.length;
  const platoonCount = platoons.length;

  return (
    <div className="space-y-4 mt-4">
      {/* Unit Management Info */}
      <Card className="card-tactical border-border/50">
        <CardHeader className="p-4 lg:p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 lg:h-10 lg:w-10 items-center justify-center rounded-lg bg-primary/20">
              <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm lg:text-base">{t('settings.unitManagement')}</CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                {t('settings.manageYourUnits')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:p-6 lg:pt-0">
          {canManageUnits ? (
            <div className="space-y-3">
              {/* Summary Statistics */}
              <div className="rounded-lg border border-border/50 bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {t('settings.unitsInYourBattalion')}
                  </span>
                  <Badge variant={isAdmin ? 'rank' : 'tactical'} className="shrink-0 text-xs">
                    {isAdmin ? t('personnel.roleAdmin') : t('personnel.roleLeader')}
                  </Badge>
                </div>
                {loading ? (
                  <p className="text-xs lg:text-sm text-muted-foreground">
                    {t('common.loading')}
                  </p>
                ) : battalionCount === 0 && companyCount === 0 && platoonCount === 0 ? (
                  <p className="text-xs lg:text-sm text-foreground">
                    {t('settings.noUnitsYet')}
                  </p>
                ) : (
                  <p className="text-xs lg:text-sm text-foreground">
                    {t('settings.unitStats', {
                      battalions: battalionCount.toString(),
                      companies: companyCount.toString(),
                      platoons: platoonCount.toString(),
                    })}
                  </p>
                )}
              </div>

              {/* Manage Units Button */}
              <Button
                className="w-full"
                onClick={() => setIsSheetOpen(true)}
              >
                {t('settings.manageUnits')}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('settings.noUnitAccess')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Units Sheet */}
      <UnitsSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  );
}
