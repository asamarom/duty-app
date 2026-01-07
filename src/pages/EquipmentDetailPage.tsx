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
import { Badge } from '@/components/ui/badge';
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
import { ArrowRight, Save, Package, User, Users, Trash2, Loader2, Building2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

type AssignmentType = 'battalion' | 'company' | 'platoon' | 'individual';

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading, updateEquipment, deleteEquipment, assignEquipment, unassignEquipment, requestAssignment, isWithinSameUnit } = useEquipment();
  const { battalions, companies, platoons, loading: unitsLoading, getCompaniesForBattalion, getPlatoonsForCompany } = useUnits();
  
  const item = equipment.find((e) => e.id === id);
  
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    description: '',
    quantity: 1,
  });

  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');

  // Get the current assignment level to determine allowed reassignments
  const currentLevel: AssignmentLevel = item?.assignmentLevel || 'unassigned';

  // Serialized items can ONLY be assigned to individuals
  const isSerializedItem = !!item?.serialNumber;

  // Determine which assignment types are allowed based on current level and serialization
  const allowedTypes = useMemo((): AssignmentType[] => {
    // Serialized items must go to individuals
    if (isSerializedItem) {
      return ['individual'];
    }
    
    switch (currentLevel) {
      case 'battalion':
        // Can reassign to company (one step down)
        return ['company'];
      case 'company':
        // Can go up to battalion or down to platoon
        return ['battalion', 'platoon'];
      case 'platoon':
        // Can go up to company or down to individual
        return ['company', 'individual'];
      case 'individual':
        // Can go up to platoon or reassign to another individual
        return ['platoon', 'individual'];
      case 'unassigned':
      default:
        // Can assign to any level
        return ['battalion', 'company', 'platoon', 'individual'];
    }
  }, [currentLevel, isSerializedItem]);

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
      if (item.currentBattalionId && item.assignmentLevel === 'battalion') {
        setSelectedBattalionId(item.currentBattalionId);
        setAssignedType('battalion');
      }
      if (item.currentCompanyId && item.assignmentLevel === 'company') {
        setSelectedCompanyId(item.currentCompanyId);
        // Find the battalion for this company
        const company = companies.find(c => c.id === item.currentCompanyId);
        if (company) {
          setSelectedBattalionId(company.battalion_id);
        }
        setAssignedType('company');
      }
      if (item.currentPlatoonId && item.assignmentLevel === 'platoon') {
        setSelectedPlatoonId(item.currentPlatoonId);
        // Find the company and battalion for this platoon
        const platoon = platoons.find(p => p.id === item.currentPlatoonId);
        if (platoon?.company_id) {
          setSelectedCompanyId(platoon.company_id);
          const company = companies.find(c => c.id === platoon.company_id);
          if (company) {
            setSelectedBattalionId(company.battalion_id);
          }
        }
        setAssignedType('platoon');
      }
      if (item.currentPersonnelId) {
        setSelectedPersonnelId(item.currentPersonnelId);
        setAssignedType('individual');
      }
    }
  }, [item, companies, platoons]);

  const loading = personnelLoading || equipmentLoading || unitsLoading;

  // Get the current assignment's hierarchy info
  const currentAssignmentInfo = useMemo(() => {
    if (!item) return { battalionId: null, companyId: null, platoonId: null };
    
    let battalionId = item.currentBattalionId || null;
    let companyId = item.currentCompanyId || null;
    let platoonId = item.currentPlatoonId || null;
    
    // If assigned to individual, find their platoon
    if (item.currentPersonnelId) {
      const person = personnel.find(p => p.id === item.currentPersonnelId);
      if (person?.platoonId) {
        platoonId = person.platoonId;
        const platoon = platoons.find(p => p.id === platoonId);
        if (platoon?.company_id) {
          companyId = platoon.company_id;
          const company = companies.find(c => c.id === companyId);
          if (company) {
            battalionId = company.battalion_id;
          }
        }
      }
    }
    
    // If assigned to platoon, find its company and battalion
    if (platoonId && !companyId) {
      const platoon = platoons.find(p => p.id === platoonId);
      if (platoon?.company_id) {
        companyId = platoon.company_id;
        const company = companies.find(c => c.id === companyId);
        if (company) {
          battalionId = company.battalion_id;
        }
      }
    }
    
    // If assigned to company, find its battalion
    if (companyId && !battalionId) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        battalionId = company.battalion_id;
      }
    }
    
    return { battalionId, companyId, platoonId };
  }, [item, personnel, companies, platoons]);

  // Get available battalions - only the current hierarchy's battalion when not unassigned
  const availableBattalions = useMemo(() => {
    if (currentLevel === 'unassigned') return battalions;
    if (currentAssignmentInfo.battalionId) {
      return battalions.filter(b => b.id === currentAssignmentInfo.battalionId);
    }
    return battalions;
  }, [battalions, currentLevel, currentAssignmentInfo.battalionId]);

  // Get available companies - filtered by hierarchy
  const availableCompanies = useMemo(() => {
    if (currentLevel === 'unassigned') {
      if (!selectedBattalionId) return [];
      return getCompaniesForBattalion(selectedBattalionId);
    }
    
    // When at company level or below, only show current company hierarchy
    if ((currentLevel === 'company' || currentLevel === 'platoon' || currentLevel === 'individual') && currentAssignmentInfo.companyId) {
      return companies.filter(c => c.id === currentAssignmentInfo.companyId);
    }
    
    // When going down from battalion to company, show companies in that battalion
    if (currentLevel === 'battalion' && currentAssignmentInfo.battalionId) {
      return getCompaniesForBattalion(currentAssignmentInfo.battalionId);
    }
    
    return getCompaniesForBattalion(selectedBattalionId);
  }, [currentLevel, currentAssignmentInfo, selectedBattalionId, getCompaniesForBattalion, companies]);

  // Get available platoons - filtered by hierarchy
  const availablePlatoons = useMemo(() => {
    if (currentLevel === 'unassigned') {
      if (!selectedCompanyId) return [];
      return getPlatoonsForCompany(selectedCompanyId);
    }
    
    // When at platoon level or individual, only show current platoon
    if ((currentLevel === 'platoon' || currentLevel === 'individual') && currentAssignmentInfo.platoonId) {
      return platoons.filter(p => p.id === currentAssignmentInfo.platoonId);
    }
    
    // When going down from company to platoon, show platoons in that company
    if (currentLevel === 'company' && currentAssignmentInfo.companyId) {
      return getPlatoonsForCompany(currentAssignmentInfo.companyId);
    }
    
    return getPlatoonsForCompany(selectedCompanyId);
  }, [currentLevel, currentAssignmentInfo, selectedCompanyId, getPlatoonsForCompany, platoons]);

  // Get available personnel - filtered by hierarchy
  const availablePersonnel = useMemo(() => {
    if (currentLevel === 'unassigned') {
      if (selectedPlatoonId) {
        return personnel.filter(p => p.platoonId === selectedPlatoonId);
      }
      return personnel;
    }
    
    // When individual is current level, only show individuals in the same platoon
    if (currentLevel === 'individual' && currentAssignmentInfo.platoonId) {
      return personnel.filter(p => p.platoonId === currentAssignmentInfo.platoonId);
    }
    
    // When going down from platoon to individual, show individuals in that platoon
    if (currentLevel === 'platoon' && currentAssignmentInfo.platoonId) {
      return personnel.filter(p => p.platoonId === currentAssignmentInfo.platoonId);
    }
    
    // Filter by selected platoon
    if (selectedPlatoonId) {
      return personnel.filter(p => p.platoonId === selectedPlatoonId);
    }
    
    return personnel;
  }, [currentLevel, currentAssignmentInfo, selectedPlatoonId, personnel]);

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

  const handleTypeChange = (type: AssignmentType) => {
    setAssignedType(type);
    // Reset selections when type changes
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
      let assignment: { personnelId?: string; platoonId?: string; companyId?: string; battalionId?: string } = {};
      
      if (assignedType === 'battalion' && selectedBattalionId) {
        assignment.battalionId = selectedBattalionId;
        hasAssignment = true;
      } else if (assignedType === 'company' && selectedCompanyId) {
        assignment.companyId = selectedCompanyId;
        hasAssignment = true;
      } else if (assignedType === 'platoon' && selectedPlatoonId) {
        assignment.platoonId = selectedPlatoonId;
        hasAssignment = true;
      } else if (assignedType === 'individual' && selectedPersonnelId) {
        assignment.personnelId = selectedPersonnelId;
        hasAssignment = true;
      }

      if (hasAssignment) {
        // Determine target level
        const targetLevel: AssignmentLevel = assignment.personnelId ? 'individual' 
          : assignment.platoonId ? 'platoon'
          : assignment.companyId ? 'company'
          : assignment.battalionId ? 'battalion'
          : 'unassigned';
        
        // Check if this is an assignment within the same unit
        const isDirect = targetLevel === 'individual' || 
          isWithinSameUnit(currentLevel, targetLevel, item!, assignment) ||
          currentLevel === 'unassigned';
        
        if (isDirect) {
          await assignEquipment(id!, assignment);
          toast.success('Equipment updated successfully');
        } else {
          await requestAssignment(id!, assignment);
          toast.success('Equipment details updated. Transfer request created pending approval.');
        }
      } else {
        await unassignEquipment(id!);
        toast.success('Equipment updated successfully');
      }

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  {item.name}
                </h1>
                {item.hasPendingTransfer && (
                  <Badge variant="outline" className="text-warning border-warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Transfer Pending
                  </Badge>
                )}
              </div>
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

            {/* Serialized item warning */}
            {isSerializedItem && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>Serialized equipment must be assigned to an individual for accountability.</span>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Assignment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['battalion', 'company', 'platoon', 'individual'] as const).map((aType) => {
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
                        {aType === 'company' && <Users className="h-4 w-4" />}
                        {aType === 'platoon' && <Users className="h-4 w-4" />}
                        {aType === 'individual' && <User className="h-4 w-4" />}
                        {aType.charAt(0).toUpperCase() + aType.slice(1)}
                      </Button>
                    );
                  })}
                </div>
                {currentLevel !== 'unassigned' && !isSerializedItem && (
                  <p className="text-xs text-muted-foreground">
                    Items can only be reassigned one level up or down the hierarchy (e.g., battalion → company → platoon → individual)
                  </p>
                )}
              </div>

              {/* Hierarchical Selection */}
              <div className="space-y-3">
                {/* Battalion Selection */}
                {(assignedType === 'battalion' || currentLevel === 'unassigned') && allowedTypes.includes('battalion') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Battalion</Label>
                    {availableBattalions.length === 1 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{availableBattalions[0].name}</span>
                      </div>
                    ) : (
                      <Select value={selectedBattalionId} onValueChange={handleBattalionChange}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Battalion" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBattalions.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {b.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Company Selection */}
                {(assignedType === 'company' || assignedType === 'platoon' || assignedType === 'individual') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Company</Label>
                    {availableCompanies.length === 1 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{availableCompanies[0].name}</span>
                      </div>
                    ) : (
                      <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCompanies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {c.name}
                              </div>
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
                    <Label className="text-xs text-muted-foreground">Platoon</Label>
                    {availablePlatoons.length === 1 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{availablePlatoons[0].name}</span>
                      </div>
                    ) : (
                      <Select value={selectedPlatoonId} onValueChange={handlePlatoonChange}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Platoon" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlatoons.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                        {availablePersonnel.map((p) => (
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
