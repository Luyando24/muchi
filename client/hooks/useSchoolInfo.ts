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
        // If no schoolId in session, create a default school info
        setSchoolInfo({
          id: 'default',
          name: 'MUCHI Demo School',
          code: 'DEMO001',
          email: 'admin@muchi.demo',
          phone: '+260 97 123 4567',
          address: '123 Education Street, Lusaka',
          district: 'Lusaka',
          province: 'Lusaka',
          schoolType: 'combined',
          status: 'active',
          subscriptionPlan: 'basic',
          userCount: 0,
          studentCount: 0,
          teacherCount: 0,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const school = await Api.getSchoolById(session.schoolId);
        setSchoolInfo(school);
      } catch (err) {
        console.error('Error fetching school info:', err);
        // Fallback to default school info when API fails
        setSchoolInfo({
          id: session.schoolId,
          name: 'MUCHI Demo School',
          code: 'DEMO001',
          email: 'admin@muchi.demo',
          phone: '+260 97 123 4567',
          address: '123 Education Street, Lusaka',
          district: 'Lusaka',
          province: 'Lusaka',
          schoolType: 'combined',
          status: 'active',
          subscriptionPlan: 'basic',
          userCount: 0,
          studentCount: 0,
          teacherCount: 0,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        });
        setError(null); // Clear error since we have fallback data
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