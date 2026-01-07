import { useState, useEffect, useMemo } from 'react';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useUnits } from '@/hooks/useUnits';
import { EquipmentWithAssignment, AssignmentLevel } from '@/hooks/useEquipment';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Users, User, Loader2, AlertTriangle } from 'lucide-react';

type AssignmentType = 'battalion' | 'company' | 'platoon' | 'individual';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: EquipmentWithAssignment[];
  onAssign: (assignment: { personnelId?: string; platoonId?: string; companyId?: string; battalionId?: string }) => Promise<void>;
}

export function BulkAssignDialog({ open, onOpenChange, selectedItems, onAssign }: BulkAssignDialogProps) {
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { battalions, companies, platoons, loading: unitsLoading, getCompaniesForBattalion, getPlatoonsForCompany } = useUnits();
  
  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loading = personnelLoading || unitsLoading;

  // Check if any selected items are serialized
  const hasSerializedItems = useMemo(() => {
    return selectedItems.some(item => !!item.serialNumber);
  }, [selectedItems]);

  // Filter out serialized items when targeting units (not individuals)
  const serializedItems = useMemo(() => {
    return selectedItems.filter(item => !!item.serialNumber);
  }, [selectedItems]);

  // Determine the common level among all selected items
  const commonLevel = useMemo((): AssignmentLevel | 'mixed' => {
    if (selectedItems.length === 0) return 'unassigned';
    
    const levels = selectedItems.map(item => item.assignmentLevel || 'unassigned');
    const uniqueLevels = [...new Set(levels)];
    
    if (uniqueLevels.length === 1) {
      return uniqueLevels[0];
    }
    return 'mixed';
  }, [selectedItems]);

  // Get common hierarchy info
  const commonHierarchyInfo = useMemo(() => {
    if (selectedItems.length === 0 || commonLevel === 'mixed' || commonLevel === 'unassigned') {
      return { battalionId: null, companyId: null, platoonId: null, isCommon: commonLevel === 'unassigned' };
    }

    let battalionId: string | null = null;
    let companyId: string | null = null;
    let platoonId: string | null = null;

    const hierarchies = selectedItems.map(item => {
      let bId = item.currentBattalionId || null;
      let cId = item.currentCompanyId || null;
      let pId = item.currentPlatoonId || null;

      // If assigned to individual, find their platoon
      if (item.currentPersonnelId) {
        const person = personnel.find(p => p.id === item.currentPersonnelId);
        if (person?.platoonId) {
          pId = person.platoonId;
          const platoon = platoons.find(p => p.id === pId);
          if (platoon?.company_id) {
            cId = platoon.company_id;
            const company = companies.find(c => c.id === cId);
            if (company) {
              bId = company.battalion_id;
            }
          }
        }
      }

      // If assigned to platoon, find its company and battalion
      if (pId && !cId) {
        const platoon = platoons.find(p => p.id === pId);
        if (platoon?.company_id) {
          cId = platoon.company_id;
          const company = companies.find(c => c.id === cId);
          if (company) {
            bId = company.battalion_id;
          }
        }
      }

      // If assigned to company, find its battalion
      if (cId && !bId) {
        const company = companies.find(c => c.id === cId);
        if (company) {
          bId = company.battalion_id;
        }
      }

      return { battalionId: bId, companyId: cId, platoonId: pId };
    });

    const firstHierarchy = hierarchies[0];
    const allSame = hierarchies.every(h => {
      if (commonLevel === 'battalion') return h.battalionId === firstHierarchy.battalionId;
      if (commonLevel === 'company') return h.companyId === firstHierarchy.companyId && h.battalionId === firstHierarchy.battalionId;
      if (commonLevel === 'platoon') return h.platoonId === firstHierarchy.platoonId && h.companyId === firstHierarchy.companyId;
      if (commonLevel === 'individual') return h.platoonId === firstHierarchy.platoonId;
      return true;
    });

    if (!allSame) {
      return { battalionId: null, companyId: null, platoonId: null, isCommon: false };
    }

    return { 
      battalionId: firstHierarchy.battalionId, 
      companyId: firstHierarchy.companyId,
      platoonId: firstHierarchy.platoonId,
      isCommon: true 
    };
  }, [selectedItems, commonLevel, personnel, companies, platoons]);

  // Determine allowed types based on common level
  const allowedTypes = useMemo((): AssignmentType[] => {
    if (commonLevel === 'mixed' || !commonHierarchyInfo.isCommon) {
      return [];
    }

    switch (commonLevel) {
      case 'battalion':
        return ['company'];
      case 'company':
        return ['battalion', 'platoon'];
      case 'platoon':
        return ['company', 'individual'];
      case 'individual':
        return ['platoon', 'individual'];
      case 'unassigned':
      default:
        return ['battalion', 'company', 'platoon', 'individual'];
    }
  }, [commonLevel, commonHierarchyInfo.isCommon]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAssignedType(allowedTypes[0] || 'battalion');
      setSelectedBattalionId('');
      setSelectedCompanyId('');
      setSelectedPlatoonId('');
      setSelectedPersonnelId('');
    }
  }, [open, allowedTypes]);

  // Get available battalions
  const availableBattalions = useMemo(() => {
    if (commonLevel === 'unassigned') return battalions;
    if (commonHierarchyInfo.battalionId) {
      return battalions.filter(b => b.id === commonHierarchyInfo.battalionId);
    }
    return battalions;
  }, [battalions, commonLevel, commonHierarchyInfo.battalionId]);

  // Get available companies
  const availableCompanies = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (!selectedBattalionId) return [];
      return getCompaniesForBattalion(selectedBattalionId);
    }
    
    if ((commonLevel === 'company' || commonLevel === 'platoon' || commonLevel === 'individual') && commonHierarchyInfo.companyId) {
      return companies.filter(c => c.id === commonHierarchyInfo.companyId);
    }
    
    if (commonLevel === 'battalion' && commonHierarchyInfo.battalionId) {
      return getCompaniesForBattalion(commonHierarchyInfo.battalionId);
    }
    
    return getCompaniesForBattalion(selectedBattalionId);
  }, [commonLevel, commonHierarchyInfo, selectedBattalionId, getCompaniesForBattalion, companies]);

  // Get available platoons
  const availablePlatoons = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (!selectedCompanyId) return [];
      return getPlatoonsForCompany(selectedCompanyId);
    }
    
    if ((commonLevel === 'platoon' || commonLevel === 'individual') && commonHierarchyInfo.platoonId) {
      return platoons.filter(p => p.id === commonHierarchyInfo.platoonId);
    }
    
    if (commonLevel === 'company' && commonHierarchyInfo.companyId) {
      return getPlatoonsForCompany(commonHierarchyInfo.companyId);
    }
    
    return getPlatoonsForCompany(selectedCompanyId);
  }, [commonLevel, commonHierarchyInfo, selectedCompanyId, getPlatoonsForCompany, platoons]);

  // Get available personnel
  const availablePersonnel = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (selectedPlatoonId) {
        return personnel.filter(p => p.platoonId === selectedPlatoonId);
      }
      return personnel;
    }
    
    if ((commonLevel === 'individual' || commonLevel === 'platoon') && commonHierarchyInfo.platoonId) {
      return personnel.filter(p => p.platoonId === commonHierarchyInfo.platoonId);
    }
    
    if (selectedPlatoonId) {
      return personnel.filter(p => p.platoonId === selectedPlatoonId);
    }
    
    return personnel;
  }, [commonLevel, commonHierarchyInfo, selectedPlatoonId, personnel]);

  // Auto-select when there's only one option
  useEffect(() => {
    if (availableBattalions.length === 1 && !selectedBattalionId) {
      setSelectedBattalionId(availableBattalions[0].id);
    }
  }, [availableBattalions, selectedBattalionId]);

  useEffect(() => {
    if (availableCompanies.length === 1 && !selectedCompanyId) {
      setSelectedCompanyId(availableCompanies[0].id);
    }
  }, [availableCompanies, selectedCompanyId]);

  useEffect(() => {
    if (availablePlatoons.length === 1 && !selectedPlatoonId) {
      setSelectedPlatoonId(availablePlatoons[0].id);
    }
  }, [availablePlatoons, selectedPlatoonId]);

  const handleTypeChange = (type: AssignmentType) => {
    setAssignedType(type);
    if (type === 'battalion') {
      setSelectedCompanyId('');
      setSelectedPlatoonId('');
      setSelectedPersonnelId('');
    } else if (type === 'company') {
      setSelectedPlatoonId('');
      setSelectedPersonnelId('');
    } else if (type === 'platoon') {
      setSelectedPersonnelId('');
    }
  };

  const handleBattalionChange = (value: string) => {
    setSelectedBattalionId(value);
    setSelectedCompanyId('');
    setSelectedPlatoonId('');
    setSelectedPersonnelId('');
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompanyId(value);
    setSelectedPlatoonId('');
    setSelectedPersonnelId('');
  };

  const handlePlatoonChange = (value: string) => {
    setSelectedPlatoonId(value);
    setSelectedPersonnelId('');
  };

  const handleSubmit = async () => {
    let assignment: { personnelId?: string; platoonId?: string; companyId?: string; battalionId?: string } = {};
    
    if (assignedType === 'battalion' && selectedBattalionId) {
      assignment.battalionId = selectedBattalionId;
    } else if (assignedType === 'company' && selectedCompanyId) {
      assignment.companyId = selectedCompanyId;
    } else if (assignedType === 'platoon' && selectedPlatoonId) {
      assignment.platoonId = selectedPlatoonId;
    } else if (assignedType === 'individual' && selectedPersonnelId) {
      assignment.personnelId = selectedPersonnelId;
    } else {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssign(assignment);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = () => {
    if (assignedType === 'battalion') return !!selectedBattalionId;
    if (assignedType === 'company') return !!selectedCompanyId;
    if (assignedType === 'platoon') return !!selectedPlatoonId;
    if (assignedType === 'individual') return !!selectedPersonnelId;
    return false;
  };

  const getTypeIcon = (type: AssignmentType) => {
    switch (type) {
      case 'battalion':
        return <Building2 className="h-4 w-4" />;
      case 'company':
      case 'platoon':
        return <Users className="h-4 w-4" />;
      case 'individual':
        return <User className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canBulkAssign = allowedTypes.length > 0;

  // Check if assigning serialized items to unit (not individual) - this is not allowed
  const hasSerializedUnitWarning = hasSerializedItems && assignedType !== 'individual';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Assign Equipment</DialogTitle>
          <DialogDescription>
            Assign {selectedItems.length} selected item{selectedItems.length > 1 ? 's' : ''} to a unit or individual.
          </DialogDescription>
        </DialogHeader>

        {!canBulkAssign ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">
              {commonLevel === 'mixed' 
                ? 'Selected items are at different assignment levels. Please select items at the same level for bulk assignment.'
                : 'Selected items are in different hierarchies. Please select items from the same hierarchy for bulk assignment.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Serialized items warning */}
            {hasSerializedUnitWarning && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Serialized items detected</p>
                  <p className="text-muted-foreground">
                    {serializedItems.length} item(s) have serial numbers and must be assigned to individuals. 
                    They will be skipped for unit assignments.
                  </p>
                </div>
              </div>
            )}

            {/* Assignment Type */}
            <div className="space-y-2">
              <Label>Assign To</Label>
              <div className="flex flex-wrap gap-2">
                {allowedTypes.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={assignedType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTypeChange(type)}
                    className="gap-2"
                  >
                    {getTypeIcon(type)}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Battalion Selection */}
            {(assignedType === 'battalion' || assignedType === 'company' || assignedType === 'platoon' || assignedType === 'individual') && (
              <div className="space-y-2">
                <Label>Battalion</Label>
                {availableBattalions.length === 1 ? (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {availableBattalions[0].name}
                  </div>
                ) : (
                  <Select value={selectedBattalionId} onValueChange={handleBattalionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select battalion" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBattalions.map((battalion) => (
                        <SelectItem key={battalion.id} value={battalion.id}>
                          {battalion.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Company Selection */}
            {(assignedType === 'company' || assignedType === 'platoon' || assignedType === 'individual') && selectedBattalionId && (
              <div className="space-y-2">
                <Label>Company</Label>
                {availableCompanies.length === 1 ? (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {availableCompanies[0].name}
                  </div>
                ) : availableCompanies.length === 0 ? (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No companies available
                  </div>
                ) : (
                  <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Platoon Selection */}
            {(assignedType === 'platoon' || assignedType === 'individual') && selectedCompanyId && (
              <div className="space-y-2">
                <Label>Platoon</Label>
                {availablePlatoons.length === 1 ? (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {availablePlatoons[0].name}
                  </div>
                ) : availablePlatoons.length === 0 ? (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No platoons available
                  </div>
                ) : (
                  <Select value={selectedPlatoonId} onValueChange={handlePlatoonChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platoon" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlatoons.map((platoon) => (
                        <SelectItem key={platoon.id} value={platoon.id}>
                          {platoon.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Personnel Selection */}
            {assignedType === 'individual' && (
              <div className="space-y-2">
                <Label>Individual</Label>
                {availablePersonnel.length === 0 ? (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No personnel available
                  </div>
                ) : (
                  <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePersonnel.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.rank} {person.lastName}, {person.firstName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canBulkAssign && (
            <Button 
              onClick={handleSubmit} 
              disabled={!isValid() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
