import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Crown, Shield, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { RoleBadges } from './RoleBadge';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/hooks/useUserRole';

interface RoleManagementProps {
  personnelId: string;
  userId: string | null;
  currentRoles: AppRole[];
  onRolesChanged: () => void;
  canManage: boolean;
  battalionId?: string | null;
  platoonId?: string | null;
}

export function RoleManagement({
  personnelId,
  userId,
  currentRoles,
  onRolesChanged,
  canManage,
  battalionId,
  platoonId,
}: RoleManagementProps) {
  const { toast } = useToast();
  const { isAdmin: viewerIsAdmin } = useUserRole();
  const [saving, setSaving] = useState(false);

  const isLeader = currentRoles.includes('leader');
  const isAdmin = currentRoles.includes('admin');

  const handleToggleLeader = async () => {
    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Cannot assign role',
        description: 'This personnel is not linked to a user account.',
      });
      return;
    }

    try {
      setSaving(true);

      if (isLeader) {
        // Remove leader role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'leader');

        if (error) throw error;

        // Also remove unit assignment
        await supabase
          .from('admin_unit_assignments')
          .delete()
          .eq('user_id', userId);

        toast({
          title: 'Role removed',
          description: 'Leader role has been removed.',
        });
      } else {
        // Determine unit type and create unit assignment
        let unitType = 'battalion';
        if (platoonId) {
          unitType = 'platoon';
        } else if (battalionId) {
          unitType = 'battalion';
        }

        // Add leader role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'leader' });

        if (error) throw error;

        // Create unit assignment for the leader
        const { error: unitError } = await supabase
          .from('admin_unit_assignments')
          .insert({
            user_id: userId,
            unit_type: unitType,
            battalion_id: battalionId || null,
            platoon_id: platoonId || null,
          });

        if (unitError) {
          console.error('Error creating unit assignment:', unitError);
          // Don't fail the whole operation if unit assignment fails
        }

        toast({
          title: 'Role assigned',
          description: 'Leader role has been assigned.',
        });
      }

      onRolesChanged();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async () => {
    if (!userId) {
      toast({
        variant: 'destructive',
        title: 'Cannot assign role',
        description: 'This personnel is not linked to a user account.',
      });
      return;
    }

    try {
      setSaving(true);

      if (isAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (error) throw error;

        toast({
          title: 'Role removed',
          description: 'Admin role has been removed.',
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (error) throw error;

        toast({
          title: 'Role assigned',
          description: 'Admin role has been assigned.',
        });
      }

      onRolesChanged();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role.',
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
            System Roles
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
          System Roles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!userId && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This personnel is not linked to a user account. Roles cannot be assigned until they sign up.</span>
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
              <Label className="font-medium">Leader</Label>
              <p className="text-xs text-muted-foreground">
                Can manage personnel and equipment in their unit
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
                <Label className="font-medium">Admin</Label>
                <p className="text-xs text-muted-foreground">
                  Full system access across all units
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
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
