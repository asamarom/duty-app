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
import { Battalion, Company, Platoon } from '@/hooks/useUnits';

type UnitType = 'battalion' | 'company' | 'platoon';

interface UnitFormData {
  name: string;
  designation: string;
  parentId?: string;
}

export default function UnitsPage() {
  const { t, dir } = useLanguage();
  const { isAdmin, isLeader } = useUserRole();
  const {
    battalions,
    companies,
    platoons,
    loading,
    getCompaniesForBattalion,
    getPlatoonsForCompany,
    createBattalion,
    updateBattalion,
    deleteBattalion,
    createCompany,
    updateCompany,
    deleteCompany,
    createPlatoon,
    updatePlatoon,
    deletePlatoon,
    refetch,
  } = useUnitsManagement();

  const [expandedBattalions, setExpandedBattalions] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [currentUnitType, setCurrentUnitType] = useState<UnitType>('battalion');
  const [currentUnit, setCurrentUnit] = useState<Battalion | Company | Platoon | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({ name: '', designation: '', parentId: '' });
  const [saving, setSaving] = useState(false);

  const canManage = isAdmin || isLeader;

  const toggleBattalion = (id: string) => {
    setExpandedBattalions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCompany = (id: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateDialog = (type: UnitType, parentId?: string) => {
    setDialogMode('create');
    setCurrentUnitType(type);
    setCurrentUnit(null);
    setFormData({ name: '', designation: '', parentId: parentId || '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (type: UnitType, unit: Battalion | Company | Platoon) => {
    setDialogMode('edit');
    setCurrentUnitType(type);
    setCurrentUnit(unit);
    setFormData({
      name: unit.name,
      designation: unit.designation || '',
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (type: UnitType, unit: Battalion | Company | Platoon) => {
    setCurrentUnitType(type);
    setCurrentUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);

    try {
      if (dialogMode === 'create') {
        if (currentUnitType === 'battalion') {
          await createBattalion({ name: formData.name, designation: formData.designation || undefined });
        } else if (currentUnitType === 'company' && formData.parentId) {
          await createCompany({
            name: formData.name,
            battalion_id: formData.parentId,
            designation: formData.designation || undefined,
          });
        } else if (currentUnitType === 'platoon' && formData.parentId) {
          await createPlatoon({
            name: formData.name,
            company_id: formData.parentId,
            designation: formData.designation || undefined,
          });
        }
      } else if (dialogMode === 'edit' && currentUnit) {
        const updateData = { name: formData.name, designation: formData.designation || undefined };
        if (currentUnitType === 'battalion') {
          await updateBattalion(currentUnit.id, updateData);
        } else if (currentUnitType === 'company') {
          await updateCompany(currentUnit.id, updateData);
        } else if (currentUnitType === 'platoon') {
          await updatePlatoon(currentUnit.id, updateData);
        }
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
      if (currentUnitType === 'battalion') {
        await deleteBattalion(currentUnit.id);
      } else if (currentUnitType === 'company') {
        await deleteCompany(currentUnit.id);
      } else if (currentUnitType === 'platoon') {
        await deletePlatoon(currentUnit.id);
      }
      setIsDeleteDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const getUnitIcon = (type: UnitType) => {
    switch (type) {
      case 'battalion':
        return Building2;
      case 'company':
        return Briefcase;
      case 'platoon':
        return Users;
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader title="Unit Management" subtitle="Manage organizational structure" />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Unit Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage battalions, companies, and platoons
            </p>
          </div>
          {canManage && (
            <Button onClick={() => openCreateDialog('battalion')}>
              <Plus className="me-2 h-4 w-4" />
              Add Battalion
            </Button>
          )}
        </header>

        {/* Mobile Add Button */}
        {canManage && (
          <div className="lg:hidden mb-4">
            <Button className="w-full" onClick={() => openCreateDialog('battalion')}>
              <Plus className="me-2 h-4 w-4" />
              Add Battalion
            </Button>
          </div>
        )}

        {/* Units Hierarchy */}
        <div className="space-y-4">
          {battalions.length === 0 ? (
            <Card className="card-tactical">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground">No Battalions</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first battalion to get started
                </p>
                {canManage && (
                  <Button className="mt-4" onClick={() => openCreateDialog('battalion')}>
                    <Plus className="me-2 h-4 w-4" />
                    Add Battalion
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            battalions.map((battalion) => {
              const battalionCompanies = getCompaniesForBattalion(battalion.id);
              const isExpanded = expandedBattalions.has(battalion.id);
              const BattalionIcon = getUnitIcon('battalion');

              return (
                <Card key={battalion.id} className="card-tactical">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleBattalion(battalion.id)}>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:opacity-80">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                            <BattalionIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className={`text-${dir === 'rtl' ? 'right' : 'left'}`}>
                            <CardTitle className="text-base">{battalion.name}</CardTitle>
                            {battalion.designation && (
                              <p className="text-xs text-muted-foreground">{battalion.designation}</p>
                            )}
                          </div>
                          <Badge variant={getStatusColor(battalion.status) as any} className="mx-2">
                            {battalion.status}
                          </Badge>
                          {battalionCompanies.length > 0 && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className={`h-4 w-4 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                            )
                          )}
                        </CollapsibleTrigger>
                        {canManage && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateDialog('company', battalion.id);
                              }}
                              title="Add Company"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog('battalion', battalion);
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
                                openDeleteDialog('battalion', battalion);
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
                        {battalionCompanies.length === 0 ? (
                          <p className="text-sm text-muted-foreground ps-12">No companies in this battalion</p>
                        ) : (
                          <div className="space-y-3 ps-6 border-s border-border ms-5">
                            {battalionCompanies.map((company) => {
                              const companyPlatoons = getPlatoonsForCompany(company.id);
                              const isCompanyExpanded = expandedCompanies.has(company.id);
                              const CompanyIcon = getUnitIcon('company');

                              return (
                                <Collapsible
                                  key={company.id}
                                  open={isCompanyExpanded}
                                  onOpenChange={() => toggleCompany(company.id)}
                                >
                                  <div className="rounded-lg border border-border bg-secondary/30 p-3">
                                    <div className="flex items-center justify-between">
                                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 hover:opacity-80">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                                          <CompanyIcon className="h-4 w-4 text-accent-foreground" />
                                        </div>
                                        <div className={`text-${dir === 'rtl' ? 'right' : 'left'}`}>
                                          <p className="text-sm font-medium">{company.name}</p>
                                          {company.designation && (
                                            <p className="text-xs text-muted-foreground">{company.designation}</p>
                                          )}
                                        </div>
                                        <Badge variant={getStatusColor(company.status) as any} className="text-xs mx-2">
                                          {company.status}
                                        </Badge>
                                        {companyPlatoons.length > 0 && (
                                          isCompanyExpanded ? (
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className={`h-3 w-3 text-muted-foreground ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                                          )
                                        )}
                                      </CollapsibleTrigger>
                                      {canManage && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCreateDialog('platoon', company.id);
                                            }}
                                            title="Add Platoon"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditDialog('company', company);
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
                                              openDeleteDialog('company', company);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>

                                    <CollapsibleContent>
                                      {companyPlatoons.length > 0 && (
                                        <div className="mt-3 space-y-2 ps-6 border-s border-border ms-4">
                                          {companyPlatoons.map((platoon) => {
                                            const PlatoonIcon = getUnitIcon('platoon');

                                            return (
                                              <div
                                                key={platoon.id}
                                                className="flex items-center justify-between rounded-md border border-border bg-background/50 p-2"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <PlatoonIcon className="h-4 w-4 text-muted-foreground" />
                                                  <div>
                                                    <p className="text-sm font-medium">{platoon.name}</p>
                                                    {platoon.designation && (
                                                      <p className="text-xs text-muted-foreground">
                                                        {platoon.designation}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <Badge
                                                    variant={getStatusColor(platoon.status) as any}
                                                    className="text-xs ms-2"
                                                  >
                                                    {platoon.status}
                                                  </Badge>
                                                </div>
                                                {canManage && (
                                                  <div className="flex items-center gap-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6"
                                                      onClick={() => openEditDialog('platoon', platoon)}
                                                    >
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                                      onClick={() => openDeleteDialog('platoon', platoon)}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create' : 'Edit'}{' '}
              {currentUnitType.charAt(0).toUpperCase() + currentUnitType.slice(1)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={`Enter ${currentUnitType} name`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation (Optional)</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData((prev) => ({ ...prev, designation: e.target.value }))}
                placeholder="e.g., Alpha, Bravo, 1st"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {dialogMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {currentUnitType}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentUnit?.name}"? This action cannot be undone.
              {currentUnitType === 'battalion' && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all companies and platoons within this battalion.
                </span>
              )}
              {currentUnitType === 'company' && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all platoons within this company.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
