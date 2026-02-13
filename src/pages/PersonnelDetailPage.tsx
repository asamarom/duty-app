import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { PersonnelDoc, UserDoc, AppRole } from '@/integrations/firebase/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Loader2,
  Phone,
  Mail,
  MapPin,
  User,
  Edit,
  X,
  Briefcase
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { UnitTreeSelector } from '@/components/personnel/UnitTreeSelector';
import { RoleManagement } from '@/components/personnel/RoleManagement';
import { RoleBadges } from '@/components/personnel/RoleBadge';
import { useCanManageRole } from '@/hooks/useCanManageRole';
import { useUnits } from '@/hooks/useUnits';


export default function PersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { units } = useUnits();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const { canManage: canManageRoles, loading: canManageLoading } = useCanManageRole(id);

  // Form state - using unit_id instead of separate battalion/company/platoon IDs
  const [formData, setFormData] = useState({
    service_number: '',
    rank: '',
    first_name: '',
    last_name: '',
    duty_positions: [] as string[],
    unit_id: null as string | null,
    is_signature_approved: false,
    phone: '',
    email: '',
    local_address: '',
  });

  const fetchRoles = useCallback(async (personnelUserId: string | null) => {
    if (!personnelUserId) {
      setRoles([]);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', personnelUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as UserDoc;
        setRoles(userData.roles || []);
      } else {
        setRoles([]);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const personRef = doc(db, 'personnel', id);
        const personSnap = await getDoc(personRef);

        if (!personSnap.exists()) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Personnel not found.',
          });
          navigate('/personnel');
          return;
        }

        const person = personSnap.data() as PersonnelDoc;

        // Store user_id for role management
        setUserId(person.userId || null);

        // Fetch roles for this personnel
        await fetchRoles(person.userId || null);

        // Parse duty_position - could be stored as string or already an array
        const dutyPositions = person.dutyPosition
          ? (Array.isArray(person.dutyPosition)
            ? person.dutyPosition
            : [person.dutyPosition])
          : [];

        setFormData({
          service_number: person.serviceNumber,
          rank: person.rank,
          first_name: person.firstName,
          last_name: person.lastName,
          duty_positions: dutyPositions,
          unit_id: person.unitId || null,
          is_signature_approved: person.isSignatureApproved || false,
          phone: person.phone || '',
          email: person.email || '',
          local_address: person.localAddress || '',
        });
      } catch (error) {
        console.error('Error fetching personnel:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load personnel details.',
        });
        navigate('/personnel');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, toast, fetchRoles]);

  // Traverse the units list to find the battalion for a given unit
  const findBattalionId = (unitId: string | null | undefined): string | null => {
    if (!unitId) return null;
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return null;
    if (unit.unit_type === 'battalion') return unit.id;
    return findBattalionId(unit.parent_id);
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      // Store duty_positions as first item for backward compatibility
      const primaryDutyPosition = formData.duty_positions.length > 0
        ? formData.duty_positions[0]
        : null;

      const battalionId = findBattalionId(formData.unit_id);

      await updateDoc(doc(db, 'personnel', id), {
        serviceNumber: formData.service_number,
        rank: formData.rank,
        firstName: formData.first_name,
        lastName: formData.last_name,
        dutyPosition: primaryDutyPosition,
        unitId: formData.unit_id || null,
        isSignatureApproved: formData.is_signature_approved,
        phone: formData.phone || null,
        email: formData.email || null,
        localAddress: formData.local_address || null,
        ...(battalionId ? { battalionId } : {}),
      });

      toast({
        title: 'Success',
        description: 'Personnel details updated successfully.',
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating personnel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update personnel details.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPrimaryDutyPosition = () => {
    return formData.duty_positions.length > 0 ? formData.duty_positions[0] : null;
  };



  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={`${formData.rank} ${formData.last_name}`}
          subtitle={t('personnel.details')}
          showBack
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/personnel')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {formData.rank} {formData.first_name} {formData.last_name}
                  </h1>
                  <RoleBadges roles={roles} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getPrimaryDutyPosition() || t('personnel.noPosition')} • {formData.service_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                    <X className="me-2 h-4 w-4" />
                    {t('common.cancel')}
                  </Button>
                  <Button variant="tactical" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="me-2 h-4 w-4" />
                    )}
                    {t('common.saveChanges')}
                  </Button>
                </>
              ) : (
                <Button variant="tactical" onClick={() => setIsEditing(true)}>
                  <Edit className="me-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Edit/Save Button */}
        <div className="lg:hidden mb-4 flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="me-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
              <Button variant="tactical" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
            </>
          ) : (
            <Button variant="tactical" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="me-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info Card */}
          <Card className="lg:col-span-2 card-tactical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {t('personnel.personalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('personnel.rank')}</Label>
                  {isEditing ? (
                    <Input
                      value={formData.rank}
                      onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                    />
                  ) : (
                    <p className="text-foreground font-medium">{formData.rank}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('personnel.serviceNumber')}</Label>
                  {isEditing ? (
                    <Input
                      value={formData.service_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, service_number: e.target.value }))}
                    />
                  ) : (
                    <p className="text-foreground font-mono">{formData.service_number}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('personnel.firstName')}</Label>
                  {isEditing ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    />
                  ) : (
                    <p className="text-foreground">{formData.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('personnel.lastName')}</Label>
                  {isEditing ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    />
                  ) : (
                    <p className="text-foreground">{formData.last_name}</p>
                  )}
                </div>
              </div>

              {/* Position & Assignment */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {t('personnel.dutyPosition')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.duty_positions[0] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, duty_positions: e.target.value ? [e.target.value] : [] }))}
                      placeholder={t('personnel.addPosition')}
                    />
                  ) : (
                    <p className="text-foreground">{formData.duty_positions[0] || t('common.na')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('equipment.assignedTo')}</Label>
                  <UnitTreeSelector
                    value={{ unit_id: formData.unit_id }}
                    onChange={(assignment) => setFormData(prev => ({
                      ...prev,
                      unit_id: assignment.unit_id,
                    }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t border-border pt-6">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  {t('personnel.contactInfo')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('personnel.phone')}</Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {formData.phone || t('common.na')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('personnel.email')}</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {formData.email || t('common.na')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>{t('personnel.localAddress')}</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.local_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, local_address: e.target.value }))}
                      placeholder={t('personnel.addressPlaceholder')}
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {formData.local_address || t('common.na')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Cards */}
          <div className="space-y-6">
            {/* Transfer Approved Card */}
            {canManageRoles && (
              <Card className="card-tactical">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {t('personnel.signatureAuthority')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('personnel.signatureApprovedBadge')}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('personnel.signatureDesc')}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_signature_approved}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_signature_approved: e.target.checked }))}
                        disabled={!isEditing}
                        className="sr-only peer"
                      />
                      <div className={cn(
                        "w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary",
                        !isEditing && "opacity-50 cursor-not-allowed"
                      )} />
                    </label>
                  </div>
                  {formData.is_signature_approved && (
                    <Badge variant="secondary" className="mt-3">
                      <Briefcase className="mr-1 h-3 w-3" />
                      {t('personnel.signatureApprovedBadge')}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Role Management - only show if user has role or can manage */}
            {(roles.some(r => r !== 'user') || canManageRoles) && (
              <RoleManagement
                personnelId={id!}
                userId={userId}
                currentRoles={roles}
                onRolesChanged={() => fetchRoles(userId)}
                canManage={canManageRoles}
                unitId={formData.unit_id}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
