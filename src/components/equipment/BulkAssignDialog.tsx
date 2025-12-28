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
import { Building2, Users, User, Loader2 } from 'lucide-react';

type AssignmentType = 'battalion' | 'platoon' | 'squad' | 'individual';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: EquipmentWithAssignment[];
  onAssign: (assignment: { personnelId?: string; platoonId?: string; squadId?: string; battalionId?: string }) => Promise<void>;
}

export function BulkAssignDialog({ open, onOpenChange, selectedItems, onAssign }: BulkAssignDialogProps) {
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { battalions, platoons, squads, loading: unitsLoading, getPlatoonsForBattalion, getSquadsForPlatoon } = useUnits();
  
  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loading = personnelLoading || unitsLoading;

  // Determine the common level among all selected items
  // Only allow reassignment if all items are at the same level
  const commonLevel = useMemo((): AssignmentLevel | 'mixed' => {
    if (selectedItems.length === 0) return 'unassigned';
    
    const levels = selectedItems.map(item => item.assignmentLevel || 'unassigned');
    const uniqueLevels = [...new Set(levels)];
    
    if (uniqueLevels.length === 1) {
      return uniqueLevels[0];
    }
    return 'mixed';
  }, [selectedItems]);

  // Get common hierarchy info - only valid if all items share the same hierarchy
  const commonHierarchyInfo = useMemo(() => {
    if (selectedItems.length === 0 || commonLevel === 'mixed' || commonLevel === 'unassigned') {
      return { battalionId: null, platoonId: null, squadId: null, isCommon: commonLevel === 'unassigned' };
    }

    let battalionId: string | null = null;
    let platoonId: string | null = null;
    let squadId: string | null = null;

    // Get hierarchy for each item and check if they're all the same
    const hierarchies = selectedItems.map(item => {
      let bId = item.currentBattalionId || null;
      let pId = item.currentPlatoonId || null;
      let sId = item.currentSquadId || null;

      // If assigned to individual, find their squad
      if (item.currentPersonnelId) {
        const person = personnel.find(p => p.id === item.currentPersonnelId);
        if (person?.squadId) {
          sId = person.squadId;
          const squad = squads.find(s => s.id === sId);
          if (squad) {
            pId = squad.platoon_id;
            const platoon = platoons.find(p => p.id === pId);
            if (platoon) {
              bId = platoon.battalion_id;
            }
          }
        }
      }

      // If assigned to squad, find its platoon and battalion
      if (sId && !pId) {
        const squad = squads.find(s => s.id === sId);
        if (squad) {
          pId = squad.platoon_id;
          const platoon = platoons.find(p => p.id === pId);
          if (platoon) {
            bId = platoon.battalion_id;
          }
        }
      }

      // If assigned to platoon, find its battalion
      if (pId && !bId) {
        const platoon = platoons.find(p => p.id === pId);
        if (platoon) {
          bId = platoon.battalion_id;
        }
      }

      return { battalionId: bId, platoonId: pId, squadId: sId };
    });

    // Check if all items have the same hierarchy at the relevant level
    const firstHierarchy = hierarchies[0];
    const allSame = hierarchies.every(h => {
      if (commonLevel === 'battalion') return h.battalionId === firstHierarchy.battalionId;
      if (commonLevel === 'platoon') return h.platoonId === firstHierarchy.platoonId && h.battalionId === firstHierarchy.battalionId;
      if (commonLevel === 'squad') return h.squadId === firstHierarchy.squadId && h.platoonId === firstHierarchy.platoonId;
      if (commonLevel === 'individual') return h.squadId === firstHierarchy.squadId;
      return true;
    });

    if (!allSame) {
      return { battalionId: null, platoonId: null, squadId: null, isCommon: false };
    }

    return { 
      battalionId: firstHierarchy.battalionId, 
      platoonId: firstHierarchy.platoonId, 
      squadId: firstHierarchy.squadId,
      isCommon: true 
    };
  }, [selectedItems, commonLevel, personnel, squads, platoons]);

  // Determine allowed types based on common level
  const allowedTypes = useMemo((): AssignmentType[] => {
    if (commonLevel === 'mixed' || !commonHierarchyInfo.isCommon) {
      return []; // Can't bulk assign if items are at different levels or different hierarchies
    }

    switch (commonLevel) {
      case 'battalion':
        return ['platoon'];
      case 'platoon':
        return ['battalion', 'squad'];
      case 'squad':
        return ['platoon', 'individual'];
      case 'individual':
        return ['squad', 'individual'];
      case 'unassigned':
      default:
        return ['battalion', 'platoon', 'squad', 'individual'];
    }
  }, [commonLevel, commonHierarchyInfo.isCommon]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setAssignedType(allowedTypes[0] || 'battalion');
      setSelectedBattalionId('');
      setSelectedPlatoonId('');
      setSelectedSquadId('');
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

  // Get available platoons
  const availablePlatoons = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (!selectedBattalionId) return [];
      return getPlatoonsForBattalion(selectedBattalionId);
    }
    
    if ((commonLevel === 'platoon' || commonLevel === 'squad' || commonLevel === 'individual') && commonHierarchyInfo.platoonId) {
      return platoons.filter(p => p.id === commonHierarchyInfo.platoonId);
    }
    
    if (commonLevel === 'battalion' && commonHierarchyInfo.battalionId) {
      return getPlatoonsForBattalion(commonHierarchyInfo.battalionId);
    }
    
    return getPlatoonsForBattalion(selectedBattalionId);
  }, [commonLevel, commonHierarchyInfo, selectedBattalionId, getPlatoonsForBattalion, platoons]);

  // Get available squads
  const availableSquads = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (!selectedPlatoonId) return [];
      return getSquadsForPlatoon(selectedPlatoonId);
    }
    
    if ((commonLevel === 'squad' || commonLevel === 'individual') && commonHierarchyInfo.squadId) {
      return squads.filter(s => s.id === commonHierarchyInfo.squadId);
    }
    
    if (commonLevel === 'platoon' && commonHierarchyInfo.platoonId) {
      return getSquadsForPlatoon(commonHierarchyInfo.platoonId);
    }
    
    return getSquadsForPlatoon(selectedPlatoonId);
  }, [commonLevel, commonHierarchyInfo, selectedPlatoonId, getSquadsForPlatoon, squads]);

  // Get available personnel
  const availablePersonnel = useMemo(() => {
    if (commonLevel === 'unassigned') {
      if (selectedSquadId) {
        return personnel.filter(p => p.squadId === selectedSquadId);
      }
      return personnel;
    }
    
    if ((commonLevel === 'individual' || commonLevel === 'squad') && commonHierarchyInfo.squadId) {
      return personnel.filter(p => p.squadId === commonHierarchyInfo.squadId);
    }
    
    if (selectedSquadId) {
      return personnel.filter(p => p.squadId === selectedSquadId);
    }
    
    return personnel;
  }, [commonLevel, commonHierarchyInfo, selectedSquadId, personnel]);

  // Auto-select when there's only one option
  useEffect(() => {
    if (availableBattalions.length === 1 && !selectedBattalionId) {
      setSelectedBattalionId(availableBattalions[0].id);
    }
  }, [availableBattalions, selectedBattalionId]);

  useEffect(() => {
    if (availablePlatoons.length === 1 && !selectedPlatoonId) {
      setSelectedPlatoonId(availablePlatoons[0].id);
    }
  }, [availablePlatoons, selectedPlatoonId]);

  useEffect(() => {
    if (availableSquads.length === 1 && !selectedSquadId) {
      setSelectedSquadId(availableSquads[0].id);
    }
  }, [availableSquads, selectedSquadId]);

  const handleTypeChange = (type: AssignmentType) => {
    setAssignedType(type);
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

  const handleSubmit = async () => {
    let assignment: { personnelId?: string; platoonId?: string; squadId?: string; battalionId?: string } = {};
    
    if (assignedType === 'battalion' && selectedBattalionId) {
      assignment.battalionId = selectedBattalionId;
    } else if (assignedType === 'platoon' && selectedPlatoonId) {
      assignment.platoonId = selectedPlatoonId;
    } else if (assignedType === 'squad' && selectedSquadId) {
      assignment.squadId = selectedSquadId;
    } else if (assignedType === 'individual' && selectedPersonnelId) {
      assignment.personnelId = selectedPersonnelId;
    } else {
      return; // No valid assignment
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
    if (assignedType === 'platoon') return !!selectedPlatoonId;
    if (assignedType === 'squad') return !!selectedSquadId;
    if (assignedType === 'individual') return !!selectedPersonnelId;
    return false;
  };

  const getTypeIcon = (type: AssignmentType) => {
    switch (type) {
      case 'battalion':
        return <Building2 className="h-4 w-4" />;
      case 'platoon':
      case 'squad':
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
            {(assignedType === 'battalion' || assignedType === 'platoon' || assignedType === 'squad' || assignedType === 'individual') && (
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

            {/* Platoon Selection */}
            {(assignedType === 'platoon' || assignedType === 'squad' || assignedType === 'individual') && selectedBattalionId && (
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

            {/* Squad Selection */}
            {(assignedType === 'squad' || assignedType === 'individual') && selectedPlatoonId && (
              <div className="space-y-2">
                <Label>Squad</Label>
                {availableSquads.length === 1 ? (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    {availableSquads[0].name}
                  </div>
                ) : availableSquads.length === 0 ? (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No squads available
                  </div>
                ) : (
                  <Select value={selectedSquadId} onValueChange={handleSquadChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select squad" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSquads.map((squad) => (
                        <SelectItem key={squad.id} value={squad.id}>
                          {squad.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Personnel Selection */}
            {assignedType === 'individual' && selectedSquadId && (
              <div className="space-y-2">
                <Label>Individual</Label>
                {availablePersonnel.length === 0 ? (
                  <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    No personnel available in this squad
                  </div>
                ) : (
                  <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select individual" />
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
            <Button onClick={handleSubmit} disabled={!isValid() || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
