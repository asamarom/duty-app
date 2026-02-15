import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Building2,
  Briefcase,
  Users,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useUnitsManagement } from '@/hooks/useUnitsManagement';
import { useUserRole } from '@/hooks/useUserRole';
import { useLanguage } from '@/contexts/LanguageContext';
import { Unit, UnitType } from '@/hooks/useUnits';

interface UnitFormData {
  name: string;
  designation: string;
  parentId?: string;
  unitType: UnitType;
}

const UNIT_ICONS: Record<UnitType, typeof Building2> = {
  battalion: Building2,
  company: Briefcase,
  platoon: Users,
};

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  battalion: 'Battalion',
  company: 'Company',
  platoon: 'Platoon',
};

const CHILD_UNIT_TYPE: Record<UnitType, UnitType | null> = {
  battalion: 'company',
  company: 'platoon',
  platoon: null,
};

export default function UnitsPage() {
  const { t, dir } = useLanguage();
  const { isAdmin, isLeader } = useUserRole();
  const {
    battalions,
    loading,
    getChildUnits,
    createUnit,
    updateUnit,
    deleteUnit,
  } = useUnitsManagement();

  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    designation: '',
    parentId: '',
    unitType: 'battalion',
  });
  const [saving, setSaving] = useState(false);

  const canManage = isAdmin || isLeader;

  const toggleUnit = (id: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateDialog = (unitType: UnitType, parentId?: string) => {
    setDialogMode('create');
    setCurrentUnit(null);
    setFormData({ name: '', designation: '', parentId: parentId || '', unitType });
    setIsDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setDialogMode('edit');
    setCurrentUnit(unit);
    setFormData({
      name: unit.name,
      designation: unit.designation || '',
      unitType: unit.unit_type,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (unit: Unit) => {
    setCurrentUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);

    try {
      if (dialogMode === 'create') {
        await createUnit({
          name: formData.name,
          unit_type: formData.unitType,
          parent_id: formData.parentId || undefined,
          designation: formData.designation || undefined,
        });
      } else if (dialogMode === 'edit' && currentUnit) {
        await updateUnit(currentUnit.id, {
          name: formData.name,
          designation: formData.designation || undefined,
        });
      }
      setIsDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUnit) return;
    setSaving(true);

    try {
      await deleteUnit(currentUnit.id);
      setIsDeleteDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'secondary';
      case 'deployed':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const renderUnit = (unit: Unit, level: number = 0) => {
    const children = getChildUnits(unit.id);
    const isExpanded = expandedUnits.has(unit.id);
    const Icon = UNIT_ICONS[unit.unit_type];
    const childType = CHILD_UNIT_TYPE[unit.unit_type];

    if (level === 0) {
      // Top level (battalion) - full card
      return (
        <Card key={unit.id} className="card-tactical">
          <Collapsible open={isExpanded} onOpenChange={() => toggleUnit(unit.id)}>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:opacity-80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className={`text-${dir === 'rtl' ? 'right' : 'left'}`}>
                    <CardTitle className="text-base">{unit.name}</CardTitle>
                    {unit.designation && (
                      <p className="text-xs text-muted-foreground">{unit.designation}</p>
                    )}
                  </div>
                  <Badge variant={getStatusColor(unit.status) as any} className="mx-2">
                    {unit.status}
                  </Badge>
                  {children.length > 0 && (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    )
                  )}
                </CollapsibleTrigger>
                {canManage && (
                  <div className="flex items-center gap-1">
                    {childType && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateDialog(childType, unit.id);
                        }}
                        title={`Add ${UNIT_TYPE_LABELS[childType]}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(unit);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(unit);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 px-4">
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground ps-12">{t('units.noSubUnits')}</p>
                ) : (
                  <div className="space-y-3 ps-6 border-s border-border ms-5">
                    {children.map((child) => renderUnit(child, level + 1))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      );
    } else if (level === 1) {
      // Second level (company) - collapsible section
      return (
        <Collapsible
          key={unit.id}
          open={isExpanded}
          onOpenChange={() => toggleUnit(unit.id)}
        >
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:opacity-80">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                  <Icon className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className={`text-${dir === 'rtl' ? 'right' : 'left'}`}>
                  <p className="text-sm font-medium">{unit.name}</p>
                  {unit.designation && (
                    <p className="text-xs text-muted-foreground">{unit.designation}</p>
                  )}
                </div>
                <Badge variant={getStatusColor(unit.status) as any} className="text-xs mx-2">
                  {unit.status}
                </Badge>
                {children.length > 0 && (
                  isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className={`h-3 w-3 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                  )
                )}
              </CollapsibleTrigger>
              {canManage && (
                <div className="flex items-center gap-1">
                  {childType && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateDialog(childType, unit.id);
                      }}
                      title={`Add ${UNIT_TYPE_LABELS[childType]}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(unit);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(unit);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <CollapsibleContent>
              {children.length > 0 && (
                <div className="mt-3 space-y-2 ps-6 border-s border-border ms-4">
                  {children.map((child) => renderUnit(child, level + 1))}
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    } else {
      // Third level (platoon) - simple row
      return (
        <div
          key={unit.id}
          className="flex items-center justify-between rounded-md border border-border bg-background/50 p-2"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{unit.name}</p>
              {unit.designation && (
                <p className="text-xs text-muted-foreground">{unit.designation}</p>
              )}
            </div>
            <Badge variant={getStatusColor(unit.status) as any} className="text-xs ms-2">
              {unit.status}
            </Badge>
          </div>
          {canManage && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => openEditDialog(unit)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => openDeleteDialog(unit)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader title={t('units.title')} subtitle={t('units.manageStructure')} />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('units.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('units.subtitle')}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => openCreateDialog('battalion')}>
              <Plus className="me-2 h-4 w-4" />
              {t('units.addBattalion')}
            </Button>
          )}
        </header>

        {/* Mobile Add Button */}
        {canManage && (
          <div className="lg:hidden mb-4">
            <Button className="w-full" onClick={() => openCreateDialog('battalion')}>
              <Plus className="me-2 h-4 w-4" />
              {t('units.addBattalion')}
            </Button>
          </div>
        )}

        {/* Units Hierarchy */}
        <div className="space-y-4">
          {battalions.length === 0 ? (
            <Card className="card-tactical">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">{t('units.noBattalions')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('units.createFirst')}
                </p>
                {canManage && (
                  <Button className="mt-4" onClick={() => openCreateDialog('battalion')}>
                    <Plus className="me-2 h-4 w-4" />
                    {t('units.addBattalion')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            battalions.map((battalion) => renderUnit(battalion))
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? t('units.create') : t('common.edit')}{' '}
              {UNIT_TYPE_LABELS[formData.unitType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('units.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={`Enter ${UNIT_TYPE_LABELS[formData.unitType].toLowerCase()} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">{t('units.designation')}</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                placeholder={t('units.designationPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {dialogMode === 'create' ? t('units.create') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('common.delete')} {currentUnit ? UNIT_TYPE_LABELS[currentUnit.unit_type] : 'unit'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('units.confirmDelete')} &ldquo;{currentUnit?.name}&rdquo;?
              {currentUnit && currentUnit.unit_type !== 'platoon' && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all sub-units within this {UNIT_TYPE_LABELS[currentUnit.unit_type].toLowerCase()}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
