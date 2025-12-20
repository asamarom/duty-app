import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { mockEquipment, mockPersonnel } from '@/data/mockData';
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
import { ArrowRight, Save, Package, User, Users, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function EquipmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const equipment = mockEquipment.find((item) => item.id === id);
  
  const [formData, setFormData] = useState({
    name: equipment?.name || '',
    serialNumber: equipment?.serialNumber || '',
    description: equipment?.description || '',
    quantity: equipment?.quantity || 1,
    assignedTo: equipment?.assignedTo || '',
    assignedType: equipment?.assignedType || 'individual' as 'individual' | 'squad' | 'team' | 'platoon',
  });

  if (!equipment) {
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

  const handleSave = () => {
    toast.success('Equipment updated successfully');
    navigate('/equipment');
  };

  const handleDelete = () => {
    // In a real app, this would delete from database and remove all assignments
    toast.success('Equipment and all assignments deleted');
    navigate('/equipment');
  };

  return (
    <MainLayout>
      <MobileHeader title={equipment.name} />
      
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
                {equipment.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {equipment.serialNumber}
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
                    Are you sure you want to delete "{equipment.name}"? This will also remove all assignments associated with this item. This action cannot be undone.
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
                    value={formData.assignedTo}
                    onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPersonnel.map((person) => (
                        <SelectItem key={person.id} value={`${person.firstName} ${person.lastName}`}>
                          {person.firstName} {person.lastName} - {person.rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="assignedTo"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
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
