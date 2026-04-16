import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Server, 
  Shield, 
  Database, 
  Activity, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Building, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  HardDrive,
  Cpu,
  Search,
  MoreVertical,
  Plus,
  Lock,
  RefreshCw,
  Download,
  Trash2,
  Edit,
  Terminal,
  Save,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import SchoolManagement from '@/components/admin/SchoolManagement';
import UserManagement from '@/components/admin/UserManagement';
import InfrastructureSettings from '@/components/admin/InfrastructureSettings';
import GlobalSettings from '@/components/admin/GlobalSettings';
import SystemDashboard from '@/components/admin/SystemDashboard';
import SystemAdminNavbar from '@/components/admin/SystemAdminNavbar';
import GovernmentPortal from '@/pages/GovernmentPortal';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Wrench } from 'lucide-react';

// Mock data for System Admin Portal
const databaseBackups: any[] = [];

const securityLogs: any[] = [];

const systemLogs: any[] = [];

export default function SystemAdminPortal() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFixingEnrollments, setIsFixingEnrollments] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const handleFixEnrollments = async () => {
    setIsFixingEnrollments(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const response = await fetch('/api/admin/system/fix-class-enrollments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Failed to fix enrollments");
      }

      toast({
        title: "Maintenance Complete",
        description: `Successfully resolved ${result.fixedCount} student enrollment mismatches.`,
      });
    } catch (error: any) {
      console.error("Fix enrollments error:", error);
      toast({
        title: "Maintenance Failed",
        description: error.message || "An error occurred during the maintenance task.",
        variant: "destructive"
      });
    } finally {
      setIsFixingEnrollments(false);
    }
  };

  const sidebarItems = [

    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "schools", label: "Schools Management", icon: Building },
    { id: "users", label: "User Directory", icon: Users },
    { id: "infrastructure", label: "Infrastructure", icon: Server },
    { id: "security", label: "Security & Access", icon: Shield },
    { id: "database", label: "Database", icon: Database },
    { id: "logs", label: "System Logs", icon: Activity },
    { id: "settings", label: "Global Settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <SystemAdminNavbar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "secondary" : "ghost"}
                    className={`w-full justify-start ${activeTab === item.id ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-slate-800 hover:text-white'}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <p className="text-sm font-medium text-white">System Secure</p>
                </div>
                <p className="text-xs text-slate-400 mb-3">Last security scan: 10 mins ago</p>
                <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-64px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <SystemDashboard onNavigate={setActiveTab} />
        </TabsContent>

            {/* Global Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <GlobalSettings />
            </TabsContent>

            {/* Schools Tab */}
            <TabsContent value="schools" className="space-y-6">
              <SchoolManagement />
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>

            {/* Infrastructure Tab */}
            <TabsContent value="infrastructure" className="space-y-6">
              <InfrastructureSettings />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Access</h2>
                  <p className="text-slate-600 dark:text-slate-400">Security audit logs and access control policies.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Security Policies
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Threat Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">Low</div>
                    <p className="text-sm text-slate-500 mt-1">No active threats detected in last 24h</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      Failed Logins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
                    <p className="text-sm text-slate-500 mt-1">Last 24 hours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      Active Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">0</div>
                    <p className="text-sm text-slate-500 mt-1">Active users</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Security Audit Log</CardTitle>
                  <CardDescription>Recent security-related events and alerts</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>User / Source</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.event}</TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                          <TableCell>{log.time}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                              log.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              log.severity === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }>
                              {log.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Database Tab */}
            <TabsContent value="database" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Database Management</h2>
                  <p className="text-slate-600 dark:text-slate-400">Database health, backups, and maintenance.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Query Console
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Overview</CardTitle>
                    <CardDescription>Database size and growth</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Primary DB Size</span>
                          <span className="font-bold">45.2 GB</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Index Size</span>
                          <span className="font-bold">12.8 GB</span>
                        </div>
                        <Progress value={25} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Logs</span>
                          <span className="font-bold">5.4 GB</span>
                        </div>
                        <Progress value={10} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>Current database performance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm text-slate-500">Connections</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">245</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" /> Optimal
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm text-slate-500">QPS</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">1.2k</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" /> Stable
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm text-slate-500">Avg Query Time</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">12ms</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" /> Fast
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm text-slate-500">Cache Hit Rate</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">94%</div>
                        <div className="text-xs text-green-600 flex items-center mt-1">
                          <CheckCircle className="h-3 w-3 mr-1" /> Good
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Backups</CardTitle>
                  <CardDescription>History of automated and manual backups</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Backup ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {databaseBackups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-mono text-xs">{backup.id}</TableCell>
                          <TableCell>{backup.name}</TableCell>
                          <TableCell>{backup.size}</TableCell>
                          <TableCell>{backup.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              backup.status === 'Success' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }>
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-blue-200 shadow-sm dark:border-blue-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Wrench className="h-5 w-5" />
                    Data Maintenance & Repairs
                  </CardTitle>
                  <CardDescription>Run system-wide diagnostic and repair tools</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Fix Mismatched Class Enrollments</h4>
                      <p className="text-sm text-slate-500 mt-1 max-w-xl">
                        Scans all students across all schools and repairs missing or incorrect class enrollments caused by spacing/case differences in bulk Excel uploads (e.g., matching "FORM 1T3" to "FORM 1 T3").
                      </p>
                    </div>
                    <Button 
                      onClick={handleFixEnrollments} 
                      disabled={isFixingEnrollments}
                      className="shrink-0 bg-blue-600 hover:bg-blue-700"
                    >
                      {isFixingEnrollments ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        "Run Diagnostic & Fix"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="text-slate-500">Log stream coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
