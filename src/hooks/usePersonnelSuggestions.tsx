import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { UserDoc } from '@/integrations/firebase/types';

interface PersonnelSuggestions {
  dutyPositions: string[];
  skills: string[];
  driverLicenses: string[];
  loading: boolean;
}

export function usePersonnelSuggestions(): PersonnelSuggestions {
  const [dutyPositions, setDutyPositions] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [driverLicenses, setDriverLicenses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // Phase 3: Query users collection instead of personnel
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const uniqueDutyPositions = new Set<string>();
        const uniqueSkills = new Set<string>();
        const uniqueLicenses = new Set<string>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as UserDoc;

          // dutyPosition removed in Phase 2, no longer available

          if (data.skills && Array.isArray(data.skills)) {
            data.skills.forEach((skill: string) => {
              if (skill) uniqueSkills.add(skill);
            });
          }

          if (data.driverLicenses && Array.isArray(data.driverLicenses)) {
            data.driverLicenses.forEach((license: string) => {
              if (license) uniqueLicenses.add(license);
            });
          }
        });

        setDutyPositions(Array.from(uniqueDutyPositions).sort());
        setSkills(Array.from(uniqueSkills).sort());
        setDriverLicenses(Array.from(uniqueLicenses).sort());
      } catch (error) {
        console.error('Error fetching personnel suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  return {
    dutyPositions,
    skills,
    driverLicenses,
    loading,
  };
}
