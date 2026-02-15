import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, UserPlus, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { useUserBattalion } from '@/hooks/useUserBattalion';
import { toast } from 'sonner';

const RANKS = ['PVT', 'PFC', 'SPC', 'CPL', 'SGT', 'SSG', 'SFC', 'MSG', '1SG', 'SGM', 'CSM',
                '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'BG', 'MG', 'LTG', 'GEN'];

export default function AddPersonnelPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAdmin } = useEffectiveRole();
  const { battalionId: userBattalionId } = useUserBattalion();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [serviceNumber, setServiceNumber] = useState('');
  const [rank, setRank] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = firstName.trim() && lastName.trim() && serviceNumber.trim() && rank;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'personnel'), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        serviceNumber: serviceNumber.trim(),
        rank,
        phone: phone.trim() || null,
        email: email.trim() || null,
        userId: null,
        unitId: userBattalionId || null,
        battalionId: userBattalionId || null,
        dutyPosition: null,
        localAddress: null,
        profileImage: null,
        locationStatus: 'home',
        readinessStatus: 'ready',
        skills: [],
        driverLicenses: [],
        isSignatureApproved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(t('personnel.addSuccess'));
      navigate('/personnel');
    } catch (err) {
      console.error(err);
      toast.error(t('personnel.addFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.noPermission')}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="lg:hidden">
        <MobileHeader
          title={t('personnel.add')}
          subtitle={t('personnel.addSubtitle')}
          showBack
          onBack={() => navigate('/personnel')}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6 max-w-2xl mx-auto">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/personnel')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('personnel.add')}
            </h1>
          </div>
        </header>

        <div className="card-tactical rounded-lg p-6 space-y-6">
          {/* Name row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t('personnel.firstName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('personnel.firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t('personnel.lastName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('personnel.lastName')}
              />
            </div>
          </div>

          {/* Service number + Rank */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceNumber">
                {t('personnel.serviceNumber')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceNumber"
                value={serviceNumber}
                onChange={(e) => setServiceNumber(e.target.value)}
                placeholder="e.g. 1234567"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rank">
                {t('personnel.rank')} <span className="text-destructive">*</span>
              </Label>
              <Select value={rank} onValueChange={setRank}>
                <SelectTrigger id="rank">
                  <SelectValue placeholder={t('personnel.rank')} />
                </SelectTrigger>
                <SelectContent>
                  {RANKS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('personnel.phone')}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('personnel.phonePlaceholder')}
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('personnel.email')}</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('personnel.emailPlaceholder')}
                type="email"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="tactical"
              onClick={handleSave}
              disabled={!isValid || saving}
            >
              {saving ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="me-2 h-4 w-4" />
              )}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
