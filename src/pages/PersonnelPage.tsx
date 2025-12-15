import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PersonnelCard } from '@/components/personnel/PersonnelCard';
import { mockPersonnel } from '@/data/mockData';
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
import { Search, Plus, Filter, Users, Grid, List } from 'lucide-react';

export default function PersonnelPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const teams = ['all', ...new Set(mockPersonnel.map((p) => p.team))];

  const filteredPersonnel = mockPersonnel.filter((person) => {
    const matchesSearch =
      person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.serviceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === 'all' || person.team === teamFilter;
    return matchesSearch && matchesTeam;
  });

  return (
    <MainLayout>
      <div className="tactical-grid min-h-screen p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Personnel Roster
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage platoon personnel, profiles, and assignments
              </p>
            </div>
            <Button variant="tactical">
              <Plus className="mr-2 h-4 w-4" />
              Add Personnel
            </Button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{mockPersonnel.length}</p>
              <p className="text-xs text-muted-foreground">Total Personnel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'on_duty').length} On Duty
            </Badge>
            <Badge variant="warning" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'active_mission').length} On Mission
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'leave').length} On Leave
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or service number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team === 'all' ? 'All Teams' : team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Personnel Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPersonnel.map((person, index) => (
            <div
              key={person.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PersonnelCard person={person} />
            </div>
          ))}
        </div>

        {filteredPersonnel.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">
              No personnel found
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
