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
import { ChevronLeft, Package, Save, Check, ChevronsUpDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { mockPersonnel, mockEquipment } from '@/data/mockData';
import { EquipmentType } from '@/types/pmtb';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const equipmentTypes: EquipmentType[] = ['weapons', 'sensitive', 'comms', 'vehicle', 'medical', 'ocie'];

export default function AddEquipmentPage() {
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [nameOpen, setNameOpen] = useState(false);
  const [hasSerial, setHasSerial] = useState(true);
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [type, setType] = useState<EquipmentType | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedType, setAssignedType] = useState<'individual' | 'squad' | 'team' | 'platoon'>('individual');

  // Get unique equipment names for autocomplete
  const existingNames = useMemo(() => {
    const names = [...new Set(mockEquipment.map(e => e.name))];
    return names.sort();
  }, []);

  const squads = ['1st Squad', '2nd Squad', '3rd Squad', 'HQ'];
  const teams = ['Alpha', 'Bravo', 'Charlie', 'HQ'];

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t('addEquipment.nameRequired'));
      return;
    }
    if (!type) {
      toast.error(t('addEquipment.typeRequired'));
      return;
    }
    if (hasSerial && !serialNumber.trim()) {
      toast.error(t('addEquipment.serialRequired'));
      return;
    }

    // Here you would save to database
    toast.success(t('addEquipment.success'));
    navigate('/equipment');
  };

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

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('addEquipment.type')} *
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as EquipmentType)}>
              <SelectTrigger className="h-12 bg-card border-border">
                <SelectValue placeholder={t('addEquipment.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {equipmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {(['individual', 'squad', 'team', 'platoon'] as const).map((aType) => (
                <Button
                  key={aType}
                  type="button"
                  variant={assignedType === aType ? 'tactical' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAssignedType(aType);
                    setAssignedTo('');
                  }}
                  className="h-10"
                >
                  {t(`addEquipment.${aType}`)}
                </Button>
              ))}
            </div>

            {/* Assignment Target */}
            {assignedType !== 'platoon' && (
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-12 bg-secondary border-border">
                  <SelectValue placeholder={t('addEquipment.selectAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  {assignedType === 'individual' && mockPersonnel.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.rank} {p.lastName}, {p.firstName}
                    </SelectItem>
                  ))}
                  {assignedType === 'squad' && squads.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                  {assignedType === 'team' && teams.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            variant="tactical" 
            size="lg"
            onClick={handleSubmit}
            className="w-full h-14 text-base"
          >
            <Save className="me-2 h-5 w-5" />
            {t('addEquipment.save')}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
