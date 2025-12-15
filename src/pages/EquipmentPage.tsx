import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { mockEquipment } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Filter, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { EquipmentType } from '@/types/pmtb';

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const types: (EquipmentType | 'all')[] = ['all', 'weapons', 'sensitive', 'comms', 'vehicle', 'medical', 'ocie'];
  const statuses = ['all', 'serviceable', 'unserviceable', 'missing'];

  const filteredEquipment = mockEquipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const serviceableCount = mockEquipment.filter((e) => e.status === 'serviceable').length;
  const unserviceableCount = mockEquipment.filter((e) => e.status === 'unserviceable').length;
  const sensitiveCount = mockEquipment.filter((e) => e.type === 'sensitive').length;

  return (
    <MainLayout>
      <div className="tactical-grid min-h-screen p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Equipment Inventory
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track and manage platoon equipment, property, and assignments
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Run Inventory
              </Button>
              <Button variant="tactical">
                <Plus className="mr-2 h-4 w-4" />
                Add Equipment
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{mockEquipment.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-l-4 border-l-success px-4 py-3">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold text-foreground">{serviceableCount}</p>
              <p className="text-xs text-muted-foreground">Serviceable</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-l-4 border-l-destructive px-4 py-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-foreground">{unserviceableCount}</p>
              <p className="text-xs text-muted-foreground">Unserviceable</p>
            </div>
          </div>
          <div className="card-tactical flex items-center gap-3 rounded-lg border-l-4 border-l-warning px-4 py-3">
            <Package className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold text-foreground">{sensitiveCount}</p>
              <p className="text-xs text-muted-foreground">Sensitive Items</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EquipmentType | 'all')}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Table */}
        <EquipmentTable equipment={filteredEquipment} />

        {filteredEquipment.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No equipment found
            </p>
            <p className="text-sm text-muted-foreground/70">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
