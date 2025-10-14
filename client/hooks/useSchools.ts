import { useState, useEffect } from 'react';

export interface School {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  schoolType: 'primary' | 'secondary' | 'combined';
  status: 'active' | 'inactive' | 'suspended';
  subscriptionPlan: 'basic' | 'standard' | 'premium';
  userCount: number;
  studentCount: number;
  teacherCount: number;
  createdAt: string;
  lastActivity: string;
  website?: string;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
}

export const useSchools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/schools');
      if (!response.ok) {
        throw new Error('Failed to fetch schools');
      }
      
      const data = await response.json();
      setSchools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching schools:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const refetch = () => {
    fetchSchools();
  };

  // Get only active schools for subscription creation
  const activeSchools = schools.filter(school => school.status === 'active');

  return {
    schools,
    activeSchools,
    loading,
    error,
    refetch
  };
};