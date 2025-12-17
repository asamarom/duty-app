import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { mockEquipment } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { EquipmentType } from '@/types/pmtb';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EquipmentPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const types: (EquipmentType | 'all')[] = ['all', 'weapons', 'sensitive', 'comms', 'vehicle', 'medical', 'ocie'];
  const statuses = ['all', 'serviceable', 'unserviceable', 'missing'];

  const filteredEquipment = mockEquipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const serviceableCount = mockEquipment.filter((e) => e.status === 'serviceable').length;
  const unserviceableCount = mockEquipment.filter((e) => e.status === 'unserviceable').length;
  const sensitiveCount = mockEquipment.filter((e) => e.type === 'sensitive').length;

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader 
          title={t('equipment.title')} 
          subtitle={`${mockEquipment.length} ${t('equipment.totalItems')}`}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('equipment.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('equipment.subtitle')}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Package className="me-2 h-4 w-4" />
                {t('reports.equipmentAudit')}
              </Button>
              <Button variant="tactical">
                <Plus className="me-2 h-4 w-4" />
                {t('common.add')} {t('nav.equipment')}
              </Button>
            </div>
          </div>
        </header>

        {/* Stats - Mobile Horizontal Scroll */}
        <div className="mb-4 lg:mb-6 flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3 min-w-[140px] lg:min-w-0">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">{mockEquipment.length}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.totalItems')}</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-s-4 border-s-success px-4 py-3 min-w-[140px] lg:min-w-0">
            <CheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-success" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">{serviceableCount}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('status.operational')}</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-s-4 border-s-destructive px-4 py-3 min-w-[140px] lg:min-w-0">
            <AlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-destructive" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">{unserviceableCount}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.requiresAttention')}</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-s-4 border-s-warning px-4 py-3 min-w-[140px] lg:min-w-0">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-warning" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">{sensitiveCount}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.sensitiveItems')}</p>
            </div>
          </div>
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="mb-4 lg:mb-6 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('equipment.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 bg-card border-border h-11"
            />
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EquipmentType | 'all')}>
              <SelectTrigger className="flex-1 bg-card border-border h-11">
                <SelectValue placeholder={t('equipment.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? t('equipment.allTypes') : type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 bg-card border-border h-11">
                <SelectValue placeholder={t('equipment.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'all' ? t('equipment.allStatus') : status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <EquipmentTable equipment={filteredEquipment} />
        </div>

        {filteredEquipment.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No equipment found
            </p>
          </div>
        )}

        {/* Mobile FAB */}
        <div className="lg:hidden fixed bottom-24 end-4 z-40">
          <Button variant="tactical" size="lg" className="h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
