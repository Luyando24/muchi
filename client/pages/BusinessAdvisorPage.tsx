import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AdvisorChat from '@/components/admin/AdvisorChat';

export default function BusinessAdvisorPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      setLoadingDashboard(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data in advisor page:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <AdvisorChat 
        sharedData={dashboardData} 
        isLoading={loadingDashboard} 
        fullScreen={true} 
      />
    </div>
  );
}
