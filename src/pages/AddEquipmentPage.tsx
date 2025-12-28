import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Package, Save, Check, ChevronsUpDown, Loader2, Building2, Users, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment } from '@/hooks/useEquipment';
import { useUnits } from '@/hooks/useUnits';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AssignmentType = 'battalion' | 'platoon' | 'squad' | 'individual';

export default function AddEquipmentPage() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading, addEquipment } = useEquipment();
  const { battalions, platoons, squads, loading: unitsLoading, getPlatoonsForBattalion, getSquadsForPlatoon } = useUnits();
  
  const [name, setName] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [hasSerial, setHasSerial] = useState(true);
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  
  // Hierarchical selection state
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  
  const [saving, setSaving] = useState(false);

  const loading = personnelLoading || equipmentLoading || unitsLoading;

  // Get unique equipment names for autocomplete
  const existingNames = useMemo(() => {
    const names = [...new Set(equipment.map(e => e.name))];
    return names.sort();
  }, [equipment]);

  // Get available platoons based on selected battalion
  const availablePlatoons = useMemo(() => {
    if (!selectedBattalionId) return [];
    return getPlatoonsForBattalion(selectedBattalionId);
  }, [selectedBattalionId, getPlatoonsForBattalion]);

  // Get available squads based on selected platoon
  const availableSquads = useMemo(() => {
    if (!selectedPlatoonId) return [];
    return getSquadsForPlatoon(selectedPlatoonId);
  }, [selectedPlatoonId, getSquadsForPlatoon]);

  // Get available personnel (could filter by squad if needed)
  const availablePersonnel = useMemo(() => {
    return personnel;
  }, [personnel]);

  // Reset child selections when parent changes
  const handleBattalionChange = (value: string) => {
    setSelectedBattalionId(value);
    setSelectedPlatoonId('');
    setSelectedSquadId('');
    setSelectedPersonnelId('');
  };

  const handlePlatoonChange = (value: string) => {
    setSelectedPlatoonId(value);
    setSelectedSquadId('');
    setSelectedPersonnelId('');
  };

  const handleSquadChange = (value: string) => {
    setSelectedSquadId(value);
    setSelectedPersonnelId('');
  };

  const handleTypeChange = (type: AssignmentType) => {
    setAssignedType(type);
    // Reset selections when type changes
    if (type === 'battalion') {
      setSelectedPlatoonId('');
      setSelectedSquadId('');
      setSelectedPersonnelId('');
    } else if (type === 'platoon') {
      setSelectedSquadId('');
      setSelectedPersonnelId('');
    } else if (type === 'squad') {
      setSelectedPersonnelId('');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t('addEquipment.nameRequired'));
      return;
    }
    if (hasSerial && !serialNumber.trim()) {
      toast.error(t('addEquipment.serialRequired'));
      return;
    }

    // Build assignment based on type
    let assignment: { personnelId?: string; platoonId?: string; squadId?: string; battalionId?: string } = {};
    
    if (assignedType === 'battalion' && selectedBattalionId) {
      assignment.battalionId = selectedBattalionId;
    } else if (assignedType === 'platoon' && selectedPlatoonId) {
      assignment.platoonId = selectedPlatoonId;
    } else if (assignedType === 'squad' && selectedSquadId) {
      assignment.squadId = selectedSquadId;
    } else if (assignedType === 'individual' && selectedPersonnelId) {
      assignment.personnelId = selectedPersonnelId;
    }

    try {
      setSaving(true);
      await addEquipment({
        name: name.trim(),
        serialNumber: hasSerial ? serialNumber.trim() : undefined,
        quantity: hasSerial ? 1 : parseInt(quantity) || 1,
      }, assignment);

      toast.success(t('addEquipment.success'));
      navigate('/equipment');
    } catch (error) {
      toast.error('Failed to add equipment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
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
          title={t('addEquipment.title')} 
          showBack
          onBack={() => navigate('/equipment')}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6" dir={dir}>
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/equipment')}
            className="mb-4"
          >
            <ChevronLeft className="me-2 h-4 w-4" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('addEquipment.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('addEquipment.subtitle')}
              </p>
            </div>
          </div>
        </header>

        {/* Form */}
        <div className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {t('addEquipment.name')} *
            </Label>
            <Popover open={nameOpen} onOpenChange={setNameOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={nameOpen}
                  className="w-full h-12 justify-between bg-card border-border text-start font-normal"
                >
                  {name || t('addEquipment.namePlaceholder')}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder={t('addEquipment.namePlaceholder')}
                    value={name}
                    onValueChange={setName}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <span className="text-muted-foreground text-sm">
                        {name ? t('addEquipment.newItem') : t('addEquipment.typeToSearch')}
                      </span>
                    </CommandEmpty>
                    <CommandGroup>
                      {existingNames
                        .filter(n => n.toLowerCase().includes(name.toLowerCase()))
                        .map((itemName) => (
                          <CommandItem
                            key={itemName}
                            value={itemName}
                            onSelect={(value) => {
                              setName(value);
                              setNameOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "me-2 h-4 w-4",
                                name === itemName ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {itemName}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Has Serial Toggle */}
          <div className="flex items-center justify-between card-tactical rounded-lg p-4">
            <div>
              <Label className="text-sm font-medium">
                {t('addEquipment.hasSerial')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('addEquipment.hasSerialDesc')}
              </p>
            </div>
            <Switch
              checked={hasSerial}
              onCheckedChange={setHasSerial}
            />
          </div>

          {/* Serial Number or Quantity */}
          {hasSerial ? (
            <div className="space-y-2">
              <Label htmlFor="serial" className="text-sm font-medium">
                {t('addEquipment.serialNumber')} *
              </Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder={t('addEquipment.serialPlaceholder')}
                className="h-12 bg-card border-border font-mono"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium">
                {t('addEquipment.quantity')}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 bg-card border-border"
              />
            </div>
          )}

          {/* Assignment Section */}
          <div className="card-tactical rounded-lg p-4 space-y-4">
            <Label className="text-sm font-medium">
              {t('addEquipment.assignment')}
            </Label>
            
            {/* Assignment Type */}
            <div className="grid grid-cols-2 gap-2">
              {(['battalion', 'platoon', 'squad', 'individual'] as const).map((aType) => (
                <Button
                  key={aType}
                  type="button"
                  variant={assignedType === aType ? 'tactical' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(aType)}
                  className="h-10 gap-2"
                >
                  {aType === 'battalion' && <Building2 className="h-4 w-4" />}
                  {aType === 'platoon' && <Users className="h-4 w-4" />}
                  {aType === 'squad' && <Users className="h-4 w-4" />}
                  {aType === 'individual' && <User className="h-4 w-4" />}
                  {aType.charAt(0).toUpperCase() + aType.slice(1)}
                </Button>
              ))}
            </div>

            {/* Hierarchical Selection */}
            <div className="space-y-3">
              {/* Battalion Selection - always show for all types */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Battalion</Label>
                <Select value={selectedBattalionId} onValueChange={handleBattalionChange}>
                  <SelectTrigger className="h-12 bg-secondary border-border">
                    <SelectValue placeholder="Select Battalion" />
                  </SelectTrigger>
                  <SelectContent>
                    {battalions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {b.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platoon Selection - show for platoon, squad, individual */}
              {assignedType !== 'battalion' && selectedBattalionId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Platoon</Label>
                  <Select value={selectedPlatoonId} onValueChange={handlePlatoonChange}>
                    <SelectTrigger className="h-12 bg-secondary border-border">
                      <SelectValue placeholder="Select Platoon" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlatoons.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {p.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Squad Selection - show for squad, individual */}
              {(assignedType === 'squad' || assignedType === 'individual') && selectedPlatoonId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Squad</Label>
                  <Select value={selectedSquadId} onValueChange={handleSquadChange}>
                    <SelectTrigger className="h-12 bg-secondary border-border">
                      <SelectValue placeholder="Select Squad" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSquads.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Individual Selection */}
              {assignedType === 'individual' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Person</Label>
                  <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                    <SelectTrigger className="h-12 bg-secondary border-border">
                      <SelectValue placeholder="Select Person" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePersonnel.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {p.rank} {p.lastName}, {p.firstName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            variant="tactical" 
            size="lg"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-14 text-base"
          >
            {saving ? (
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
            ) : (
              <Save className="me-2 h-5 w-5" />
            )}
            {t('addEquipment.save')}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}