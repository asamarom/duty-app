import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useEquipment } from '@/hooks/useEquipment';
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
import { ArrowRight, Save, Package, User, Users, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const { equipment, loading: equipmentLoading, updateEquipment, deleteEquipment, assignEquipment, unassignEquipment } = useEquipment();
  
  const item = equipment.find((e) => e.id === id);
  
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    description: '',
    quantity: 1,
    assignedToId: '', // Store the personnel ID
    assignedType: 'individual' as 'individual' | 'squad' | 'team' | 'platoon',
  });

  // Initialize form data when equipment is loaded
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        serialNumber: item.serialNumber || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        assignedToId: (item as any).currentPersonnelId || '',
        assignedType: item.assignedType || 'individual',
      });
    }
  }, [item]);

  const loading = personnelLoading || equipmentLoading;

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

      // Handle assignment
      if (formData.assignedToId) {
        await assignEquipment(id!, { personnelId: formData.assignedToId });
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
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedType">Assignment Type</Label>
                <Select
                  value={formData.assignedType}
                  onValueChange={(value) => setFormData({ ...formData, assignedType: value as 'individual' | 'squad' | 'team' | 'platoon' })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Individual
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team
                      </div>
                    </SelectItem>
                    <SelectItem value="squad">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Squad
                      </div>
                    </SelectItem>
                    <SelectItem value="platoon">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Platoon
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">
                  {formData.assignedType === 'individual' ? 'Assigned To (Person)' : `Assigned To (${formData.assignedType})`}
                </Label>
                {formData.assignedType === 'individual' ? (
                  <Select
                    value={formData.assignedToId || "unassigned"}
                    onValueChange={(value) => setFormData({ ...formData, assignedToId: value === "unassigned" ? "" : value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {personnel.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.firstName} {person.lastName} - {person.rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assignedTo"
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    placeholder={`Enter ${formData.assignedType} name`}
                    className="bg-background"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
