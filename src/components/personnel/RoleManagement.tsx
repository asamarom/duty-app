import { useState } from 'react';
import { doc, getDoc, updateDoc, addDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { UserDoc, UnitDoc, AppRole } from '@/integrations/firebase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crown, Shield, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useUnits } from '@/hooks/useUnits';
import { RoleBadges } from './RoleBadge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RoleManagementProps {
  personnelId: string;
  userId: string | null;
  currentRoles: AppRole[];
  onRolesChanged: () => void;
  canManage: boolean;
  unitId?: string | null;
}

export function RoleManagement({
  personnelId,
  userId,
  currentRoles,
  onRolesChanged,
  canManage,
  unitId,
}: RoleManagementProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAdmin: viewerIsAdmin } = useEffectiveRole();
  const { getUnitById } = useUnits();
  const [saving, setSaving] = useState(false);

  const isLeader = currentRoles.includes('leader');
  const isAdmin = currentRoles.includes('admin');

  const handleToggleLeader = async () => {
    if (!userId) {
      toast({
        variant: 'destructive',
        title: t('personnel.cannotAssignRole'),
        description: t('personnel.notLinkedToAccount'),
      });
      return;
    }

    try {
      setSaving(true);

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? (userDocSnap.data() as UserDoc) : { roles: [] };
      const currentUserRoles = userData.roles || [];

      if (isLeader) {
        // Remove leader role
        const newRoles = currentUserRoles.filter((r) => r !== 'leader');
        await updateDoc(userDocRef, { roles: newRoles });

        // Also remove unit assignment
        const assignmentsRef = collection(db, 'adminUnitAssignments');
        const q = query(assignmentsRef, where('userId', '==', userId));
        const assignmentsSnap = await getDocs(q);
        const deletePromises = assignmentsSnap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        toast({
          title: t('personnel.roleRemoved'),
          description: t('personnel.leaderRoleRemoved'),
        });
      } else {
        // Get unit type from the unit
        const unit = unitId ? getUnitById(unitId) : null;
        const unitType = unit?.unit_type || 'battalion';

        // Add leader role
        const newRoles = [...currentUserRoles.filter((r) => r !== 'leader'), 'leader'] as AppRole[];
        await updateDoc(userDocRef, { roles: newRoles });

        // Create unit assignment for the leader
        if (unitId) {
          try {
            const assignmentsRef = collection(db, 'adminUnitAssignments');
            await addDoc(assignmentsRef, {
              userId,
              unitType,
              unitId,
            });
          } catch (unitError) {
            console.error('Error creating unit assignment:', unitError);
          }
        }

        toast({
          title: t('personnel.roleAssigned'),
          description: t('personnel.leaderRoleAssigned'),
        });
      }

      onRolesChanged();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('personnel.failedToUpdateRole'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!userId) {
      toast({
        variant: 'destructive',
        title: t('personnel.cannotAssignRole'),
        description: t('personnel.notLinkedToAccount'),
      });
      return;
    }

    try {
      setSaving(true);

      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? (userDocSnap.data() as UserDoc) : { roles: [] };
      const currentUserRoles = userData.roles || [];

      if (isAdmin) {
        // Remove admin role
        const newRoles = currentUserRoles.filter((r) => r !== 'admin');
        await updateDoc(userDocRef, { roles: newRoles });

        toast({
          title: t('personnel.roleRemoved'),
          description: t('personnel.adminRoleRemoved'),
        });
      } else {
        // Add admin role
        const newRoles = [...currentUserRoles.filter((r) => r !== 'admin'), 'admin'] as AppRole[];
        await updateDoc(userDocRef, { roles: newRoles });

        toast({
          title: t('personnel.roleAssigned'),
          description: t('personnel.adminRoleAssigned'),
        });
      }

      onRolesChanged();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error.message || t('personnel.failedToUpdateRole'),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    // Just show current roles without management options
    if (currentRoles.length === 0 || (currentRoles.length === 1 && currentRoles[0] === 'user')) {
      return null;
    }
    return (
      <Card className="card-tactical">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            {t('personnel.systemRoles')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RoleBadges roles={currentRoles} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-tactical">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          {t('personnel.systemRoles')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!userId && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{t('personnel.notLinkedToAccountWarning')}</span>
          </div>
        )}

        {/* Leader Role Toggle */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border transition-colors",
          isLeader ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30"
        )}>
          <div className="flex items-center gap-3">
            <Crown className={cn(
              "h-5 w-5",
              isLeader ? "text-warning" : "text-muted-foreground"
            )} />
            <div>
              <Label className="font-medium">{t('personnel.roleLeader')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('personnel.roleLeaderDesc')}
              </p>
            </div>
          </div>
          <Switch
            checked={isLeader}
            onCheckedChange={handleToggleLeader}
            disabled={saving || !userId}
          />
        </div>

        {/* Admin Role Toggle - Only visible to admins */}
        {viewerIsAdmin && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-colors",
            isAdmin ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"
          )}>
            <div className="flex items-center gap-3">
              <Shield className={cn(
                "h-5 w-5",
                isAdmin ? "text-destructive" : "text-muted-foreground"
              )} />
              <div>
                <Label className="font-medium">{t('personnel.roleAdmin')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('personnel.roleAdminDesc')}
                </p>
              </div>
            </div>
            <Switch
              checked={isAdmin}
              onCheckedChange={handleToggleAdmin}
              disabled={saving || !userId}
            />
          </div>
        )}

        {saving && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.saving')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
