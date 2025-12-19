import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { mockEquipment } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EquipmentPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEquipment = mockEquipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
              <Button variant="tactical" onClick={() => navigate('/equipment/add')}>
                <Plus className="me-2 h-4 w-4" />
                {t('common.add')} {t('nav.equipment')}
              </Button>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-4 lg:mb-6">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3 w-fit">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">{mockEquipment.length}</p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.totalItems')}</p>
            </div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="mb-4 lg:mb-6">
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('equipment.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 bg-card border-border h-11"
            />
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
          <Button 
            variant="tactical" 
            size="lg" 
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => navigate('/equipment/add')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}