import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        const { data, error } = await supabase
          .from('personnel')
          .select('duty_position, skills, driver_licenses');

        if (error) throw error;

        // Extract unique duty positions
        const uniqueDutyPositions = new Set<string>();
        // Extract unique skills
        const uniqueSkills = new Set<string>();
        // Extract unique driver licenses
        const uniqueLicenses = new Set<string>();

        (data || []).forEach((person) => {
          // Duty positions
          if (person.duty_position) {
            uniqueDutyPositions.add(person.duty_position);
          }
          
          // Skills array
          if (person.skills && Array.isArray(person.skills)) {
            person.skills.forEach((skill: string) => {
              if (skill) uniqueSkills.add(skill);
            });
          }
          
          // Driver licenses array
          if (person.driver_licenses && Array.isArray(person.driver_licenses)) {
            person.driver_licenses.forEach((license: string) => {
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
