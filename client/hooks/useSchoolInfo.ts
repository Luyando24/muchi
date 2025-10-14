import { useState, useEffect } from 'react';
import { Api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface SchoolInfo {
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
}

export const useSchoolInfo = () => {
  const { session } = useAuth();
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!session?.schoolId) {
        setSchoolInfo(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const school = await Api.getSchoolById(session.schoolId);
        setSchoolInfo(school);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch school information');
        console.error('Error fetching school info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolInfo();
  }, [session?.schoolId]);

  return {
    schoolInfo,
    loading,
    error
  };
};