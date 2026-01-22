import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { BulkAssignDialog } from '@/components/equipment/BulkAssignDialog';
import { useEquipment, EquipmentWithAssignment, AssignmentLevel } from '@/hooks/useEquipment';
import { Button } from '@/components/ui/button';
import { Search, Plus, Package, Loader2, CheckSquare, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function EquipmentPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { equipment, loading, assignEquipment, requestAssignment, isWithinSameUnit, refetch } = useEquipment();
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const selectedItems = useMemo(() => {
    return equipment.filter(item => selectedIds.has(item.id)) as EquipmentWithAssignment[];
  }, [equipment, selectedIds]);

  const handleToggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedIds(new Set());
    }
  };

  const handleBulkAssign = async (assignment: { personnelId?: string; unitId?: string }) => {
    try {
      let directCount = 0;
      let requestCount = 0;

      // Determine target level based on assignment
      const targetLevel: AssignmentLevel = assignment.personnelId ? 'individual'
        : assignment.unitId ? 'battalion' // Will be refined by the actual unit type
          : 'unassigned';

      // Process each selected item
      for (const itemId of selectedIds) {
        const item = equipment.find(e => e.id === itemId);
        if (!item) continue;

        const currentLevel = item.assignmentLevel || 'unassigned';

        // Check if this is an assignment to a member within the same unit
        // Assigning to individual from unit level is always direct (within same unit)
        const isDirect = targetLevel === 'individual' ||
          isWithinSameUnit(currentLevel, targetLevel, item, assignment) ||
          currentLevel === 'unassigned';

        if (isDirect) {
          await assignEquipment(itemId, assignment);
          directCount++;
        } else {
          await requestAssignment(itemId, assignment);
          requestCount++;
        }
      }

      if (directCount > 0 && requestCount > 0) {
        toast.success(`Assigned ${directCount} item${directCount > 1 ? 's' : ''} directly. Created ${requestCount} transfer request${requestCount > 1 ? 's' : ''} pending approval.`);
      } else if (directCount > 0) {
        toast.success(`Successfully assigned ${directCount} item${directCount > 1 ? 's' : ''}`);
      } else if (requestCount > 0) {
        toast.success(`Created ${requestCount} transfer request${requestCount > 1 ? 's' : ''} pending approval.`);
      }

      setSelectedIds(new Set());
      setSelectMode(false);
      await refetch();
    } catch (error) {
      toast.error('Failed to process some items');
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
          title={t('equipment.title')}
          subtitle={`${new Set(equipment.map(e => e.id.split('--')[0])).size} ${t('equipment.totalItems')}`}
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
              <Button
                variant={selectMode ? 'default' : 'outline'}
                onClick={handleToggleSelectMode}
              >
                <CheckSquare className="me-2 h-4 w-4" />
                {selectMode ? 'Cancel Selection' : 'Select Items'}
              </Button>
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

        {/* Bulk Action Bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="mb-4 p-4 card-tactical rounded-lg flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 me-1" />
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setBulkAssignOpen(true)}>
                Assign Selected
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 lg:mb-6">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3 w-fit">
            <Package className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            <div>
              <p className="text-xl lg:text-2xl font-bold text-foreground">
                {new Set(equipment.map(e => e.id.split('--')[0])).size}
              </p>
              <p className="text-[10px] lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.totalItems')}</p>
            </div>
          </div>
        </div>

        {/* Search Filter with Autocomplete */}
        <div className="mb-4 lg:mb-6">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="relative max-w-md cursor-pointer">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <input
                  placeholder={t('equipment.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setOpen(true)}
                  className="flex h-11 w-full rounded-md border border-border bg-card ps-10 pe-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>No equipment found.</CommandEmpty>
                  <CommandGroup>
                    {equipment
                      .filter((item) =>
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (item.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={(value) => {
                            setSearchQuery(value);
                            setOpen(false);
                          }}
                        >
                          <Package className="me-2 h-4 w-4 text-muted-foreground" />
                          <span>{item.name}</span>
                          <span className="ms-auto text-xs text-muted-foreground">{item.serialNumber}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile Select Mode Toggle */}
        <div className="mb-4 lg:hidden">
          <Button
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleSelectMode}
            className="w-full"
          >
            <CheckSquare className="me-2 h-4 w-4" />
            {selectMode ? 'Cancel Selection' : 'Select Items'}
          </Button>
        </div>

        {/* Equipment Table */}
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <EquipmentTable
            equipment={filteredEquipment}
            selectable={selectMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </div>

        {filteredEquipment.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No equipment found
            </p>
          </div>
        )}

        {/* Mobile FAB - show Assign button when items selected, otherwise Add */}
        <div className="lg:hidden fixed bottom-24 end-4 z-40">
          {selectMode && selectedIds.size > 0 ? (
            <Button
              variant="tactical"
              size="lg"
              className="h-14 px-6 rounded-full shadow-lg"
              onClick={() => setBulkAssignOpen(true)}
            >
              Assign ({selectedIds.size})
            </Button>
          ) : (
            <Button
              variant="tactical"
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => navigate('/equipment/add')}
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Assign Dialog */}
      <BulkAssignDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        selectedItems={selectedItems}
        onAssign={handleBulkAssign}
      />
    </MainLayout>
  );
}
