import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import type { PersonnelDoc } from '@/integrations/firebase/types';

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
        const personnelRef = collection(db, 'personnel');
        const snapshot = await getDocs(personnelRef);

        const uniqueDutyPositions = new Set<string>();
        const uniqueSkills = new Set<string>();
        const uniqueLicenses = new Set<string>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as PersonnelDoc;

          if (data.dutyPosition) {
            uniqueDutyPositions.add(data.dutyPosition);
          }

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
