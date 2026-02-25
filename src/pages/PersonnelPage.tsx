import { useEffect, useMemo, useState } from 'react';
import { usePersonnel } from '@/hooks/usePersonnel';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { UserDoc, AppRole } from '@/integrations/firebase/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { PersonnelCard } from '@/components/personnel/PersonnelCard';
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
import { Search, Plus, Users, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useEffectiveRole } from '@/hooks/useEffectiveRole';
import type { Personnel } from '@/types/pmtb';

interface PersonnelWithRoles extends Personnel {
  userRoles: AppRole[];
}


export default function PersonnelPage() {
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const { isAdmin, isLeader } = useEffectiveRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [personnel, setPersonnel] = useState<PersonnelWithRoles[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const { personnel: basePersonnel, loading: personnelHookLoading } = usePersonnel();

  const loading = personnelHookLoading || rolesLoading;

  useEffect(() => {
    if (personnelHookLoading || basePersonnel.length === 0) return;

    let active = true;

    const fetchRoles = async () => {
      try {
        setRolesLoading(true);

        const mappedPersonnel: PersonnelWithRoles[] = basePersonnel.map((p) => ({
          ...p,
          userRoles: [],
        }));

        // Get user_ids that are not null
        const userIds = basePersonnel
          .filter((p) => (p as PersonnelWithRoles & { userId?: string }).userId)
          .map((p) => (p as PersonnelWithRoles & { userId?: string }).userId!);

        // Fetch roles for these users
        if (userIds.length > 0) {
          const userRolesMap = new Map<string, AppRole[]>();

          // Batch fetch users (30 at a time due to Firestore limit)
          for (let i = 0; i < userIds.length; i += 30) {
            const batch = userIds.slice(i, i + 30);
            const usersRef = collection(db, 'users');
            const usersQuery = query(usersRef, where(documentId(), 'in', batch));
            const usersSnapshot = await getDocs(usersQuery);

            usersSnapshot.docs.forEach((docSnap) => {
              const userData = docSnap.data() as UserDoc;
              userRolesMap.set(docSnap.id, userData.roles || []);
            });
          }

          // Attach roles to personnel
          mappedPersonnel.forEach((p, index) => {
            const userId = (basePersonnel[index] as PersonnelWithRoles & { userId?: string })?.userId;
            if (userId) {
              p.userRoles = userRolesMap.get(userId) || [];
            }
          });
        }

        if (active) setPersonnel(mappedPersonnel);
      } catch {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('personnel.loadListFailed'),
        });
      } finally {
        if (active) setRolesLoading(false);
      }
    };

    fetchRoles();
    return () => {
      active = false;
    };
  }, [basePersonnel, personnelHookLoading, toast]);

  // Filter by unit
  const uniqueUnits = useMemo(() => {
    return ['all', ...new Set(personnel.map((p) => p.unitId).filter(Boolean))] as string[];
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter((person) => {
      const matchesSearch =
        person.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.serviceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = teamFilter === 'all' || person.unitId === teamFilter;
      return matchesSearch && matchesFilter;
    });
  }, [personnel, searchQuery, teamFilter]);

  return (
    <MainLayout>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <MobileHeader
          title={t('personnel.title')}
          subtitle={loading ? t('common.loading') : `${personnel.length} ${t('nav.personnel')}`}
        />
      </div>

      <div className="tactical-grid min-h-screen p-4 lg:p-6" dir={dir}>
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
            {(isAdmin || isLeader) && (
              <Button variant="tactical" onClick={() => navigate('/personnel/add')}>
                <Plus className="me-2 h-4 w-4" />
                {t('personnel.add')}
              </Button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('personnel.loading')}</p>
          </div>
        ) : (
          <>
            {/* Mobile Stats */}
            <div className="lg:hidden mb-4 flex items-center gap-2 overflow-x-auto pb-2">
              <Badge variant="secondary" className="px-3 py-1.5 whitespace-nowrap">
                {personnel.length} {t('personnel.total')}
              </Badge>
            </div>

            {/* Desktop Stats Bar */}
            <div className="mb-6 hidden lg:flex items-center gap-4">
              <div className="card-tactical flex items-center gap-3 rounded-lg px-4 py-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-bold text-foreground">{personnel.length}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.totalPersonnel')}</p>
                </div>
              </div>
            </div>

            {/* Filters - Mobile Optimized with Collapse */}
            <div className="mb-4 lg:mb-6">
              <Button
                variant="outline"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full sm:hidden mb-3 justify-between"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t('personnel.filters')}
                </span>
                {filtersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <div className={`flex flex-col sm:flex-row gap-3 ${filtersExpanded ? 'block' : 'hidden sm:flex'}`}>
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('personnel.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-10 bg-card border-border"
                  />
                </div>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] bg-card border-border">
                    <SelectValue placeholder={t('units.allUnits')} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueUnits.map((unitId) => (
                      <SelectItem key={unitId} value={unitId}>
                        {unitId === 'all' ? t('units.allUnits') : unitId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Personnel Grid - Mobile Single Column */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPersonnel.map((person, index) => (
                <div
                  key={person.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <PersonnelCard person={person} roles={person.userRoles} onClick={() => navigate(`/personnel/${person.id}`)} />
                </div>
              ))}
            </div>

            {filteredPersonnel.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-muted-foreground">
                  {t('personnel.noPersonnelFound')}
                </p>
              </div>
            )}

            {/* Mobile FAB */}
            {(isAdmin || isLeader) && (
              <div className="lg:hidden fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] end-4 z-40">
                <Button
                  variant="tactical"
                  size="lg"
                  className="h-14 w-14 rounded-full shadow-lg"
                  onClick={() => navigate('/personnel/add')}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
