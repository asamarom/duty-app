import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
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
import { Search, Plus, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PersonnelPage() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');

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
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader 
          title={t('personnel.title')} 
          subtitle={`${mockPersonnel.length} ${t('nav.personnel')}`}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6">
        {/* Desktop Header */}
        <header className="mb-6 hidden lg:block">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('personnel.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('personnel.subtitle')}
              </p>
            </div>
            <Button variant="tactical">
              <Plus className="me-2 h-4 w-4" />
              {t('common.add')} {t('nav.personnel')}
            </Button>
          </div>
        </header>

        {/* Mobile Stats */}
        <div className="lg:hidden mb-4 flex items-center gap-2 overflow-x-auto pb-2">
          <Badge variant="success" className="px-3 py-1.5 whitespace-nowrap">
            {mockPersonnel.filter((p) => p.locationStatus === 'on_duty').length} {t('status.onDuty')}
          </Badge>
          <Badge variant="warning" className="px-3 py-1.5 whitespace-nowrap">
            {mockPersonnel.filter((p) => p.locationStatus === 'active_mission').length} {t('status.onMission')}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 whitespace-nowrap">
            {mockPersonnel.filter((p) => p.locationStatus === 'leave').length} Leave
          </Badge>
        </div>

        {/* Desktop Stats Bar */}
        <div className="mb-6 hidden lg:flex items-center gap-4">
          <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{mockPersonnel.length}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalPersonnel')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'on_duty').length} {t('status.onDuty')}
            </Badge>
            <Badge variant="warning" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'active_mission').length} {t('status.onMission')}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {mockPersonnel.filter((p) => p.locationStatus === 'leave').length} On Leave
            </Badge>
          </div>
        </div>

        {/* Filters - Mobile Optimized */}
        <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('personnel.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 bg-card border-border h-11"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-card border-border h-11">
              <SelectValue placeholder={t('personnel.allPositions')} />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team === 'all' ? t('personnel.allPositions') : team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Personnel Grid - Mobile Single Column */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPersonnel.map((person, index) => (
            <div
              key={person.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
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
          </div>
        )}

        {/* Mobile FAB */}
        <div className="lg:hidden fixed bottom-24 end-4 z-40">
          <Button variant="tactical" size="lg" className="h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
