import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { BulkAssignDialog } from '@/components/equipment/BulkAssignDialog';
import { useEquipment, EquipmentWithAssignment, AssignmentLevel } from '@/hooks/useEquipment';
import { useAssignmentRequests } from '@/hooks/useAssignmentRequests';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Search, Plus, Package, Loader2, CheckSquare, X, ChevronDown, ChevronUp, ArrowRight, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
  const { requests } = useAssignmentRequests();
  const { user } = useAuth();
  const { isAdmin, isLeader } = useEffectiveRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(true);

  const hasAdminAccess = isAdmin || isLeader;

  const myPendingRequests = requests.filter(
    r => r.requested_by === user?.uid && r.status === 'pending'
  );

  useEffect(() => {
    if (myPendingRequests.length > 0) {
      setMyRequestsOpen(true);
    }
  }, [myPendingRequests.length]);

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

      if (directCount > 0 || requestCount > 0) {
        toast.success(t('equipment.assignSuccess'));
      }

      setSelectedIds(new Set());
      setSelectMode(false);
      await refetch();
    } catch (error) {
      toast.error(t('equipment.failedProcess'));
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('equipment.loadingEquipment')}</p>
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
                {selectMode ? t('equipment.cancelSelection') : t('equipment.selectItems')}
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
                {selectedIds.size} {t('equipment.selectItems')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 me-1" />
                {t('equipment.clearSelection')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setBulkAssignOpen(true)}>
                {t('equipment.assignSelected')}
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
              <p className="text-xs lg:text-xs text-muted-foreground whitespace-nowrap">{t('equipment.totalItems')}</p>
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
                  <CommandEmpty>{t('equipment.noEquipmentFound')}</CommandEmpty>
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
            {selectMode ? t('equipment.cancelSelection') : t('equipment.selectItems')}
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
              {t('equipment.noEquipmentFound')}
            </p>
          </div>
        )}

        {/* My Transfer Requests - shown for regular users and leaders */}
        {!isAdmin && (
          <div data-testid="my-requests-section" className="mt-6">
            <Collapsible open={myRequestsOpen} onOpenChange={setMyRequestsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{t('myRequests.sectionTitle')}</span>
                    {myPendingRequests.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {myPendingRequests.length}
                      </Badge>
                    )}
                  </div>
                  {myRequestsOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-0">
                    {myPendingRequests.length === 0 ? (
                      <div
                        data-testid="my-requests-empty"
                        className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm"
                      >
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        {t('myRequests.noRequests')}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {myPendingRequests.map(request => (
                          <li
                            key={request.id}
                            data-testid="my-requests-row"
                            className="flex items-center gap-3 px-4 py-3"
                          >
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {request.equipment_name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <span>{t('myRequests.toUnit')}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="truncate">{request.to_unit_name}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant="outline" className="text-xs text-warning border-warning">
                                <Clock className="h-3 w-3 me-1" />
                                {request.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {t('myRequests.submittedOn')} {format(new Date(request.requested_at), 'MMM d')}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Mobile FAB - show Assign button when items selected, otherwise Add */}
        <div className="lg:hidden fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] end-4 z-40">
          {selectMode && selectedIds.size > 0 ? (
            <Button
              variant="tactical"
              size="lg"
              className="h-14 px-6 rounded-full shadow-lg"
              onClick={() => setBulkAssignOpen(true)}
            >
              {t('equipment.assignSelected')} ({selectedIds.size})
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
