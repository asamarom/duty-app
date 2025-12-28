import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment, AssignmentLevel } from '@/hooks/useEquipment';
import { useUnits } from '@/hooks/useUnits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Save, Package, User, Users, Trash2, Loader2, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type AssignmentType = 'battalion' | 'platoon' | 'squad' | 'individual';

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading, updateEquipment, deleteEquipment, assignEquipment, unassignEquipment } = useEquipment();
  const { battalions, platoons, squads, loading: unitsLoading, getPlatoonsForBattalion, getSquadsForPlatoon } = useUnits();
  
  const item = equipment.find((e) => e.id === id);
  
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    description: '',
    quantity: 1,
  });

  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');

  // Get the current assignment level to determine allowed reassignments
  const currentLevel: AssignmentLevel = item?.assignmentLevel || 'unassigned';

  // Determine which assignment types are allowed based on current level
  const allowedTypes = useMemo((): AssignmentType[] => {
    switch (currentLevel) {
      case 'battalion':
        // Can reassign to platoon or individual within platoon
        return ['platoon', 'individual'];
      case 'platoon':
        // Can reassign to squad or individual within squad
        return ['squad', 'individual'];
      case 'squad':
        // Can only reassign to individual
        return ['individual'];
      case 'individual':
        // Already at lowest level, can only reassign to another individual
        return ['individual'];
      case 'unassigned':
      default:
        // Can assign to any level
        return ['battalion', 'platoon', 'squad', 'individual'];
    }
  }, [currentLevel]);

  // Initialize form data when equipment is loaded
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        serialNumber: item.serialNumber || '',
        description: item.description || '',
        quantity: item.quantity || 1,
      });

      // Set current assignment state
      if (item.currentBattalionId) {
        setSelectedBattalionId(item.currentBattalionId);
        setAssignedType('battalion');
      }
      if (item.currentPlatoonId) {
        setSelectedPlatoonId(item.currentPlatoonId);
        // Find the battalion for this platoon
        const platoon = platoons.find(p => p.id === item.currentPlatoonId);
        if (platoon) {
          setSelectedBattalionId(platoon.battalion_id);
        }
        setAssignedType('platoon');
      }
      if (item.currentSquadId) {
        setSelectedSquadId(item.currentSquadId);
        // Find the platoon and battalion for this squad
        const squad = squads.find(s => s.id === item.currentSquadId);
        if (squad) {
          setSelectedPlatoonId(squad.platoon_id);
          const platoon = platoons.find(p => p.id === squad.platoon_id);
          if (platoon) {
            setSelectedBattalionId(platoon.battalion_id);
          }
        }
        setAssignedType('squad');
      }
      if (item.currentPersonnelId) {
        setSelectedPersonnelId(item.currentPersonnelId);
        setAssignedType('individual');
      }
    }
  }, [item, platoons, squads]);

  const loading = personnelLoading || equipmentLoading || unitsLoading;

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

  if (loading) {
    return (
      <MainLayout>
        <MobileHeader title="Loading..." />
        <div className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!item) {
    return (
      <MainLayout>
        <MobileHeader title="Equipment Not Found" />
        <div className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Equipment Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested equipment could not be found.</p>
            <Button onClick={() => navigate('/equipment')}>
              <ArrowRight className="me-2 h-4 w-4 rotate-180" />
              Back to Equipment
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleSave = async () => {
    try {
      // Update equipment details
      await updateEquipment(id!, {
        name: formData.name,
        serialNumber: formData.serialNumber || undefined,
        description: formData.description || undefined,
        quantity: formData.quantity,
      });

      // Build assignment based on type
      let hasAssignment = false;
      let assignment: { personnelId?: string; platoonId?: string; squadId?: string; battalionId?: string } = {};
      
      if (assignedType === 'battalion' && selectedBattalionId) {
        assignment.battalionId = selectedBattalionId;
        hasAssignment = true;
      } else if (assignedType === 'platoon' && selectedPlatoonId) {
        assignment.platoonId = selectedPlatoonId;
        hasAssignment = true;
      } else if (assignedType === 'squad' && selectedSquadId) {
        assignment.squadId = selectedSquadId;
        hasAssignment = true;
      } else if (assignedType === 'individual' && selectedPersonnelId) {
        assignment.personnelId = selectedPersonnelId;
        hasAssignment = true;
      }

      if (hasAssignment) {
        await assignEquipment(id!, assignment);
      } else {
        await unassignEquipment(id!);
      }

      toast.success('Equipment updated successfully');
      navigate('/equipment');
    } catch (error) {
      toast.error('Failed to update equipment');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEquipment(id!);
      toast.success('Equipment deleted');
      navigate('/equipment');
    } catch (error) {
      toast.error('Failed to delete equipment');
    }
  };

  return (
    <MainLayout>
      <MobileHeader title={item.name} />
      
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/equipment')}
              className="shrink-0"
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                {item.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {item.serialNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{item.name}"? This will also remove all assignments associated with this item. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save Changes</span>
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl space-y-6">
          {/* Basic Info */}
          <div className="card-tactical rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Item Details
            </h2>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="bg-background font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="bg-background"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card-tactical rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Assignment
            </h2>

            {/* Current Assignment Info */}
            {currentLevel !== 'unassigned' && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <span className="text-muted-foreground">Currently assigned to: </span>
                <span className="font-medium">{item.assigneeName}</span>
                <span className="text-muted-foreground"> ({currentLevel})</span>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['battalion', 'platoon', 'squad', 'individual'] as const).map((aType) => {
                    const isAllowed = allowedTypes.includes(aType);
                    return (
                      <Button
                        key={aType}
                        type="button"
                        variant={assignedType === aType ? 'tactical' : 'outline'}
                        size="sm"
                        onClick={() => isAllowed && handleTypeChange(aType)}
                        disabled={!isAllowed}
                        className="h-10 gap-2"
                      >
                        {aType === 'battalion' && <Building2 className="h-4 w-4" />}
                        {aType === 'platoon' && <Users className="h-4 w-4" />}
                        {aType === 'squad' && <Users className="h-4 w-4" />}
                        {aType === 'individual' && <User className="h-4 w-4" />}
                        {aType.charAt(0).toUpperCase() + aType.slice(1)}
                      </Button>
                    );
                  })}
                </div>
                {currentLevel !== 'unassigned' && (
                  <p className="text-xs text-muted-foreground">
                    Items can only be reassigned down the hierarchy (e.g., battalion → platoon → squad → individual)
                  </p>
                )}
              </div>

              {/* Hierarchical Selection */}
              <div className="space-y-3">
                {/* Battalion Selection - show for battalion type or when unassigned */}
                {(assignedType === 'battalion' || currentLevel === 'unassigned') && allowedTypes.includes('battalion') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Battalion</Label>
                    <Select value={selectedBattalionId} onValueChange={handleBattalionChange}>
                      <SelectTrigger className="bg-background">
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
                )}

                {/* Platoon Selection - for platoon assignment or drilling down */}
                {(assignedType === 'platoon' || assignedType === 'squad' || assignedType === 'individual') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Platoon</Label>
                    <Select value={selectedPlatoonId} onValueChange={handlePlatoonChange}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Platoon" />
                      </SelectTrigger>
                      <SelectContent>
                        {(currentLevel === 'battalion' ? availablePlatoons : platoons).map((p) => (
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

                {/* Squad Selection - for squad or individual assignment */}
                {(assignedType === 'squad' || assignedType === 'individual') && selectedPlatoonId && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Squad</Label>
                    <Select value={selectedSquadId} onValueChange={handleSquadChange}>
                      <SelectTrigger className="bg-background">
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
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {personnel.map((p) => (
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
          </div>
        </div>
      </div>
    </MainLayout>
  );
}