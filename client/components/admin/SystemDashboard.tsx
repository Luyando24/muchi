
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Building, 
  Users, 
  Server, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  X,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SystemStats {
  totalSchools: number;
  activeUsers: number;
  serverUptime: string;
  systemLoad: number;
}

interface ServiceHealth {
  name: string;
  status: 'Operational' | 'Maintenance' | 'Degraded';
  load: number;
  latency: string;
}

interface Alert {
  id: string;
  type: 'Warning' | 'Error' | 'Info';
  message: string;
  time: string;
  source: string;
}

interface SystemDashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function SystemDashboard({ onNavigate }: SystemDashboardProps) {
  const [stats, setStats] = useState<SystemStats>({
    totalSchools: 0,
    activeUsers: 0,
    serverUptime: "0%",
    systemLoad: 0
  });
  
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Dashboard fetch failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.stats);
      setServices(data.services);
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show toast on every interval error to avoid spamming
      if (loading) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load system dashboard",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionSchool = () => {
    if (onNavigate) {
      onNavigate('schools');
    }
  };

  const handleDismissAlert = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/alerts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to dismiss alert');

      setAlerts(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Alert Dismissed",
        description: "The alert has been removed from the dashboard.",
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to dismiss alert",
      });
    }
  };

  const handleRestartService = async (name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      toast({
        title: "Restart Initiated",
        description: `Restarting ${name}...`,
      });

      const response = await fetch(`/api/admin/services/${encodeURIComponent(name)}/restart`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to restart service');

      // Refresh data to show maintenance status
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error restarting service:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restart service",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            System Overview
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time monitoring of platform health and performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700" onClick={handleProvisionSchool}>
            <Plus className="h-4 w-4 mr-2" />
            Provision School
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Schools</p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalSchools}</h3>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">All Operational</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active Users</p>
                <h3 className="text-2xl font-bold mt-2">{stats.activeUsers.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600">Registered Accounts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Server Uptime</p>
                <h3 className="text-2xl font-bold mt-2">{stats.serverUptime}</h3>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg">
                <Server className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500">System Status:</span>
              <span className="text-green-600 ml-1 font-medium">Healthy</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">System Load</p>
                <h3 className="text-2xl font-bold mt-2">{stats.systemLoad}%</h3>
              </div>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg">
                <Cpu className="h-5 w-5" />
              </div>
            </div>
            <Progress value={stats.systemLoad} className="mt-4 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Infrastructure Health */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Infrastructure Health</CardTitle>
            <CardDescription>Status of key system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full ${service.status === 'Operational' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{service.name}</p>
                      <p className="text-xs text-slate-500">Latency: {service.latency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-1/3">
                    <div className="w-full">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Load</span>
                        <span className="font-medium">{service.load}%</span>
                      </div>
                      <Progress value={service.load} className="h-1.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={service.status === 'Operational' ? 'outline' : 'secondary'} className={service.status === 'Operational' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                        {service.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-500" onClick={() => handleRestartService(service.name)} title="Restart Service">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent warnings and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  No active alerts
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="relative flex gap-3 items-start p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    {alert.type === 'Warning' ? <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" /> :
                     alert.type === 'Error' ? <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" /> :
                     <CheckCircle className="h-5 w-5 text-blue-500 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white pr-6">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] h-5 px-1">{alert.source}</Badge>
                        <span className="text-xs text-slate-500">{alert.time}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleDismissAlert(alert.id)} title="Dismiss Alert">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
