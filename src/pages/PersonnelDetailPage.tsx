import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin,
  Award,
  Car,
  User,
  Shield,
  Edit,
  X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DutyPosition, LocationStatus, ReadinessStatus } from '@/types/pmtb';
import { UnitTreeSelector } from '@/components/personnel/UnitTreeSelector';

const dutyPositions: DutyPosition[] = [
  'Platoon Leader',
  'Platoon Sergeant',
  'Squad Leader',
  'Team Leader',
  'RTO',
  'Medic',
  'Rifleman',
  'Driver',
  'Gunner',
];

const locationStatuses: { value: LocationStatus; label: string }[] = [
  { value: 'on_duty', label: 'On Duty' },
  { value: 'off_duty', label: 'Off Duty' },
  { value: 'home', label: 'Home' },
  { value: 'active_mission', label: 'Active Mission' },
  { value: 'leave', label: 'Leave' },
  { value: 'tdy', label: 'TDY' },
];

const readinessStatuses: { value: ReadinessStatus; label: string; className: string }[] = [
  { value: 'ready', label: 'Ready', className: 'bg-success/20 text-success border-success/30' },
  { value: 'warning', label: 'Warning', className: 'bg-warning/20 text-warning border-warning/30' },
  { value: 'critical', label: 'Critical', className: 'bg-destructive/20 text-destructive border-destructive/30' },
];

interface Squad {
  id: string;
  name: string;
}

export default function PersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    service_number: '',
    rank: '',
    first_name: '',
    last_name: '',
    duty_position: '' as string,
    battalion_id: null as string | null,
    platoon_id: null as string | null,
    squad_id: null as string | null,
    phone: '',
    email: '',
    local_address: '',
    location_status: 'home' as LocationStatus,
    readiness_status: 'ready' as ReadinessStatus,
    skills: [] as string[],
    driver_licenses: [] as string[],
    profile_image: '' as string | null,
  });

  const [skillInput, setSkillInput] = useState('');
  const [licenseInput, setLicenseInput] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: person, error } = await supabase
          .from('personnel')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setFormData({
          service_number: person.service_number,
          rank: person.rank,
          first_name: person.first_name,
          last_name: person.last_name,
          duty_position: person.duty_position || '',
          battalion_id: (person as any).battalion_id || null,
          platoon_id: (person as any).platoon_id || null,
          squad_id: person.squad_id || null,
          phone: person.phone || '',
          email: person.email || '',
          local_address: person.local_address || '',
          location_status: person.location_status as LocationStatus,
          readiness_status: person.readiness_status as ReadinessStatus,
          skills: person.skills || [],
          driver_licenses: person.driver_licenses || [],
          profile_image: person.profile_image,
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
  }, [id, navigate, toast]);

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('personnel')
        .update({
          service_number: formData.service_number,
          rank: formData.rank,
          first_name: formData.first_name,
          last_name: formData.last_name,
          duty_position: formData.duty_position || null,
          battalion_id: formData.battalion_id || null,
          platoon_id: formData.platoon_id || null,
          squad_id: formData.squad_id || null,
          phone: formData.phone || null,
          email: formData.email || null,
          local_address: formData.local_address || null,
          location_status: formData.location_status,
          readiness_status: formData.readiness_status,
          skills: formData.skills,
          driver_licenses: formData.driver_licenses,
          profile_image: formData.profile_image || null,
        } as any)
        .eq('id', id);

      if (error) throw error;

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

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  const addLicense = () => {
    if (licenseInput.trim() && !formData.driver_licenses.includes(licenseInput.trim())) {
      setFormData(prev => ({
        ...prev,
        driver_licenses: [...prev.driver_licenses, licenseInput.trim()],
      }));
      setLicenseInput('');
    }
  };

  const removeLicense = (license: string) => {
    setFormData(prev => ({
      ...prev,
      driver_licenses: prev.driver_licenses.filter(l => l !== license),
    }));
  };

  const currentReadiness = readinessStatuses.find(s => s.value === formData.readiness_status);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
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
          title={`${formData.rank} ${formData.last_name}`}
          subtitle="Personnel Details"
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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {formData.rank} {formData.first_name} {formData.last_name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formData.duty_position || 'No position assigned'} • {formData.service_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                    <X className="me-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button variant="tactical" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="me-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="tactical" onClick={() => setIsEditing(true)}>
                  <Edit className="me-2 h-4 w-4" />
                  Edit
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
                Cancel
              </Button>
              <Button variant="tactical" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="me-2 h-4 w-4" />
                )}
                Save
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
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rank</Label>
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
                  <Label>Service Number</Label>
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
                  <Label>First Name</Label>
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
                  <Label>Last Name</Label>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duty Position</Label>
                  {isEditing ? (
                    <Select
                      value={formData.duty_position}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, duty_position: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {dutyPositions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-foreground">{formData.duty_position || 'Not assigned'}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Unit Assignment</Label>
                  <UnitTreeSelector
                    value={{
                      battalion_id: formData.battalion_id,
                      platoon_id: formData.platoon_id,
                      squad_id: formData.squad_id,
                    }}
                    onChange={(assignment) => setFormData(prev => ({
                      ...prev,
                      battalion_id: assignment.battalion_id,
                      platoon_id: assignment.platoon_id,
                      squad_id: assignment.squad_id,
                    }))}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t border-border pt-6">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Contact Information
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {formData.phone || 'Not provided'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
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
                        {formData.email || 'Not provided'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label>Local Address</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.local_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, local_address: e.target.value }))}
                      placeholder="Enter address"
                      rows={2}
                    />
                  ) : (
                    <p className="text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {formData.local_address || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Skills Card */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="card-tactical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Location Status</Label>
                  {isEditing ? (
                    <Select
                      value={formData.location_status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, location_status: value as LocationStatus }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="mt-1">
                      {locationStatuses.find(s => s.value === formData.location_status)?.label}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Readiness Status</Label>
                  {isEditing ? (
                    <Select
                      value={formData.readiness_status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, readiness_status: value as ReadinessStatus }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {readinessStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={cn('mt-1 border', currentReadiness?.className)}>
                      {currentReadiness?.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills Card */}
            <Card className="card-tactical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="tactical" className="gap-1">
                      {skill}
                      {isEditing && (
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {formData.skills.length === 0 && !isEditing && (
                    <p className="text-sm text-muted-foreground">No skills listed</p>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add skill"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                      Add
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Licenses Card */}
            <Card className="card-tactical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Driver Licenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {formData.driver_licenses.map((license) => (
                    <Badge key={license} variant="secondary" className="gap-1">
                      {license}
                      {isEditing && (
                        <button
                          onClick={() => removeLicense(license)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  {formData.driver_licenses.length === 0 && !isEditing && (
                    <p className="text-sm text-muted-foreground">No licenses listed</p>
                  )}
                </div>
                {isEditing && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value)}
                      placeholder="Add license"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLicense())}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addLicense}>
                      Add
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
