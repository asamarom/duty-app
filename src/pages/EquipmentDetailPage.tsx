import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment, AssignmentLevel } from '@/hooks/useEquipment';
import { useUnits } from '@/hooks/useUnits';
import { useUserBattalion } from '@/hooks/useUserBattalion';
import { useTransferHistory } from '@/hooks/useTransferHistory';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowRight, Package, User, Users, Trash2, Loader2, Building2, AlertTriangle, History, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type AssignmentType = 'battalion' | 'company' | 'platoon' | 'individual';

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading, deleteEquipment, assignEquipment, requestAssignment, isWithinSameUnit, canDeleteEquipment } = useEquipment();
  const { battalions, companies, platoons, loading: unitsLoading, getCompaniesForBattalion, getPlatoonsForCompany } = useUnits();
  const { battalionId: userBattalionId, loading: battalionLoading } = useUserBattalion();
  const { history, loading: historyLoading } = useTransferHistory(id);
  
  const item = equipment.find((e) => e.id === id);
  
  const [assignedType, setAssignedType] = useState<AssignmentType>('battalion');
  const [selectedBattalionId, setSelectedBattalionId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [saving, setSaving] = useState(false);

  // Get current user's personnel record - search by matching email or check personnel hook for user_id mapping
  const currentUserPersonnel = useMemo(() => {
    // Personnel records may be linked via email or a user_id field
    return personnel.find(p => p.email === user?.email);
  }, [personnel, user?.email]);

  // Get the current assignment level to determine allowed reassignments
  const currentLevel: AssignmentLevel = item?.assignmentLevel || 'unassigned';

  // Serialized items can ONLY be assigned to individuals
  const isSerializedItem = !!item?.serialNumber;

  // Check if user can delete this equipment
  const userCanDelete = useMemo(() => {
    if (!item) return false;
    return canDeleteEquipment(item, currentUserPersonnel?.id);
  }, [item, canDeleteEquipment, currentUserPersonnel?.id]);

  // Determine which assignment types are allowed based on current level and serialization
  const allowedTypes = useMemo((): AssignmentType[] => {
    // Serialized items must go to individuals
    if (isSerializedItem) {
      return ['individual'];
    }
    
    switch (currentLevel) {
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
  }, [currentLevel, isSerializedItem]);

  // Initialize state when equipment is loaded
  useEffect(() => {
    if (item) {
      // Set transfer quantity to current quantity
      setTransferQuantity(item.currentQuantity || item.quantity || 1);

      // Set current assignment state
      if (item.currentBattalionId && item.assignmentLevel === 'battalion') {
        setSelectedBattalionId(item.currentBattalionId);
        setAssignedType('battalion');
      }
      if (item.currentCompanyId && item.assignmentLevel === 'company') {
        setSelectedCompanyId(item.currentCompanyId);
        const company = companies.find(c => c.id === item.currentCompanyId);
        if (company) {
          setSelectedBattalionId(company.battalion_id);
        }
        setAssignedType('company');
      }
      if (item.currentPlatoonId && item.assignmentLevel === 'platoon') {
        setSelectedPlatoonId(item.currentPlatoonId);
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

  const loading = personnelLoading || equipmentLoading || unitsLoading || battalionLoading;

  // Auto-set battalion from user's profile when unassigned
  useEffect(() => {
    if (userBattalionId && !selectedBattalionId && currentLevel === 'unassigned') {
      setSelectedBattalionId(userBattalionId);
    }
  }, [userBattalionId, selectedBattalionId, currentLevel]);

  // Get the current assignment's hierarchy info
  const currentAssignmentInfo = useMemo(() => {
    if (!item) return { battalionId: null, companyId: null, platoonId: null };
    
    let battalionId = item.currentBattalionId || null;
    let companyId = item.currentCompanyId || null;
    let platoonId = item.currentPlatoonId || null;
    
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
    
    if (companyId && !battalionId) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        battalionId = company.battalion_id;
      }
    }
    
    return { battalionId, companyId, platoonId };
  }, [item, personnel, companies, platoons]);

  // Get available battalions
  const availableBattalions = useMemo(() => {
    if (currentLevel === 'unassigned' && userBattalionId) {
      return battalions.filter(b => b.id === userBattalionId);
    }
    if (currentAssignmentInfo.battalionId) {
      return battalions.filter(b => b.id === currentAssignmentInfo.battalionId);
    }
    return battalions;
  }, [battalions, currentLevel, currentAssignmentInfo.battalionId, userBattalionId]);

  // Get available companies
  const availableCompanies = useMemo(() => {
    // For battalion-level items transferring to company, show companies in that battalion
    if (currentLevel === 'battalion' && currentAssignmentInfo.battalionId) {
      return getCompaniesForBattalion(currentAssignmentInfo.battalionId);
    }
    
    // For unassigned items, use the selected battalion
    if (currentLevel === 'unassigned') {
      if (!selectedBattalionId) return [];
      return getCompaniesForBattalion(selectedBattalionId);
    }
    
    // For items at company/platoon/individual level going back up, show current company
    if ((currentLevel === 'company' || currentLevel === 'platoon' || currentLevel === 'individual') && currentAssignmentInfo.companyId) {
      return companies.filter(c => c.id === currentAssignmentInfo.companyId);
    }
    
    // Fallback to selected battalion
    if (selectedBattalionId) {
      return getCompaniesForBattalion(selectedBattalionId);
    }
    
    return [];
  }, [currentLevel, currentAssignmentInfo, selectedBattalionId, getCompaniesForBattalion, companies]);

  // Get available platoons
  const availablePlatoons = useMemo(() => {
    if (currentLevel === 'unassigned') {
      if (!selectedCompanyId) return [];
      return getPlatoonsForCompany(selectedCompanyId);
    }
    
    if ((currentLevel === 'platoon' || currentLevel === 'individual') && currentAssignmentInfo.platoonId) {
      return platoons.filter(p => p.id === currentAssignmentInfo.platoonId);
    }
    
    if (currentLevel === 'company' && currentAssignmentInfo.companyId) {
      return getPlatoonsForCompany(currentAssignmentInfo.companyId);
    }
    
    return getPlatoonsForCompany(selectedCompanyId);
  }, [currentLevel, currentAssignmentInfo, selectedCompanyId, getPlatoonsForCompany, platoons]);

  // Get available personnel
  const availablePersonnel = useMemo(() => {
    if (currentLevel === 'unassigned') {
      if (selectedPlatoonId) {
        return personnel.filter(p => p.platoonId === selectedPlatoonId);
      }
      return personnel;
    }
    
    if (currentLevel === 'individual' && currentAssignmentInfo.platoonId) {
      return personnel.filter(p => p.platoonId === currentAssignmentInfo.platoonId);
    }
    
    if (currentLevel === 'platoon' && currentAssignmentInfo.platoonId) {
      return personnel.filter(p => p.platoonId === currentAssignmentInfo.platoonId);
    }
    
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

  const handleTransfer = async () => {
    try {
      setSaving(true);
      
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
        const targetLevel: AssignmentLevel = assignment.personnelId ? 'individual' 
          : assignment.platoonId ? 'platoon'
          : assignment.companyId ? 'company'
          : assignment.battalionId ? 'battalion'
          : 'unassigned';
        
        const isDirect = targetLevel === 'individual' || 
          isWithinSameUnit(currentLevel, targetLevel, item!, assignment) ||
          currentLevel === 'unassigned';
        
        if (isDirect) {
          await assignEquipment(id!, assignment, transferQuantity);
          toast.success('Equipment transferred successfully');
        } else {
          await requestAssignment(id!, assignment, undefined, transferQuantity);
          toast.success('Transfer request created pending approval.');
        }

        navigate('/equipment');
      } else {
        toast.error('Please select a transfer destination');
      }
    } catch (error) {
      toast.error('Failed to transfer equipment');
    } finally {
      setSaving(false);
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

  const maxQuantity = item.currentQuantity || item.quantity || 1;

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
                {item.serialNumber || `Quantity: ${maxQuantity}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userCanDelete ? (
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
                      Are you sure you want to delete "{item.name}"? This will also remove all transfer history. This action cannot be undone.
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
            ) : (
              <Button variant="ghost" size="icon" disabled title="Only the creator can delete when item is assigned back to them">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Equipment Info (Read-Only) */}
          <div className="card-tactical rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Item Details
            </h2>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{item.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {item.serialNumber ? 'Serial Number' : 'Quantity'}
                  </Label>
                  <p className="font-medium font-mono">
                    {item.serialNumber || maxQuantity}
                  </p>
                </div>
              </div>
              
              {item.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-xs text-muted-foreground">Current Assignment</Label>
                <div className="flex items-center gap-2 mt-1">
                  {currentLevel === 'individual' && <User className="h-4 w-4 text-muted-foreground" />}
                  {(currentLevel === 'platoon' || currentLevel === 'company') && <Users className="h-4 w-4 text-muted-foreground" />}
                  {currentLevel === 'battalion' && <Building2 className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium">{item.assigneeName || 'Unassigned'}</span>
                  <Badge variant="outline" className="text-xs">{currentLevel}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Section */}
          <div className="card-tactical rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Transfer Equipment
            </h2>

            {/* Serialized item warning */}
            {isSerializedItem && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>Serialized equipment must be assigned to an individual for accountability.</span>
              </div>
            )}

            {/* Quantity selector for bulk items */}
            {!isSerializedItem && maxQuantity > 1 && (
              <div className="space-y-2">
                <Label>Transfer Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTransferQuantity(Math.max(1, transferQuantity - 1))}
                    disabled={transferQuantity <= 1}
                    className="h-10 w-10"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 text-center bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setTransferQuantity(Math.min(maxQuantity, transferQuantity + 1))}
                    disabled={transferQuantity >= maxQuantity}
                    className="h-10 w-10"
                  >
                    +
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    of {maxQuantity} available
                  </span>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Assignment Type */}
              <div className="space-y-2">
                <Label>Transfer To</Label>
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
                    Items can only be transferred one level up or down the hierarchy.
                  </p>
                )}
              </div>

              {/* Hierarchical Selection */}
              <div className="space-y-3">
                {/* Battalion */}
                {selectedBattalionId && (assignedType === 'battalion' || currentLevel === 'unassigned') && allowedTypes.includes('battalion') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Battalion</Label>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{battalions.find(b => b.id === selectedBattalionId)?.name || 'Unknown'}</span>
                    </div>
                  </div>
                )}
                {!selectedBattalionId && currentLevel === 'unassigned' && !battalionLoading && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <span>No battalion assigned to your profile. Contact an admin to set your battalion.</span>
                  </div>
                )}

                {/* Company Selection */}
                {(assignedType === 'company' || assignedType === 'platoon' || assignedType === 'individual') && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Company</Label>
                    {availableCompanies.length === 0 ? (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>No companies available in this battalion.</span>
                      </div>
                    ) : availableCompanies.length === 1 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{availableCompanies[0].name}</span>
                      </div>
                    ) : (
                      <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder="Select Company" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
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
                    {availablePlatoons.length === 0 ? (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>No platoons available in this company.</span>
                      </div>
                    ) : availablePlatoons.length === 1 ? (
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{availablePlatoons[0].name}</span>
                      </div>
                    ) : (
                      <Select value={selectedPlatoonId} onValueChange={handlePlatoonChange}>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder="Select Platoon" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
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
                    {availablePersonnel.length === 0 ? (
                      <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>No personnel available. {selectedPlatoonId ? 'This platoon has no assigned personnel.' : 'Select a platoon first.'}</span>
                      </div>
                    ) : (
                      <Select value={selectedPersonnelId} onValueChange={setSelectedPersonnelId}>
                        <SelectTrigger className="bg-background h-10">
                          <SelectValue placeholder="Select Person" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
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
                    )}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleTransfer} 
                className="w-full gap-2"
                disabled={saving || item.hasPendingTransfer}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {item.hasPendingTransfer ? 'Transfer Pending' : 'Transfer Equipment'}
              </Button>
            </div>
          </div>

          {/* Transfer History */}
          <div className="card-tactical rounded-xl p-4 lg:p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Transfer History
            </h2>
            
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transfer history yet
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <div key={record.id} className="flex items-start gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{record.fromUnitType}</Badge>
                        <span className="font-medium">{record.fromName}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">{record.toUnitType}</Badge>
                        <span className="font-medium">{record.toName}</span>
                        {record.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">x{record.quantity}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.transferredAt), 'MMM d, yyyy HH:mm')}
                        {record.transferredByName && ` • by ${record.transferredByName}`}
                      </div>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground italic">{record.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
