import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
import AdminSidebar from '@/components/dashboard/AdminSidebar';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { Progress } from '../components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Activity, 
  HardDrive,
  Clock,
  Users,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Menu,
  LogOut,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Eye,
  Zap,
  Server,
  FileText,
  Calendar,
  TrendingUp,
  Gauge
} from 'lucide-react';
import { Api } from '@/lib/api';

// Interfaces
interface DatabaseStats {
  total_tables: number;
  total_size_mb: number;
  total_rows: number;
  connection_count: number;
  uptime_seconds: number;
  version: string;
}

interface TableInfo {
  table_name: string;
  table_schema: string;
  table_type: string;
  row_count: number;
  size_mb: number;
}

interface BackupInfo {
  id: string;
  filename: string;
  size_mb: number;
  created_at: string;
  type: 'manual' | 'automatic';
  status: 'completed' | 'failed' | 'in_progress';
}

interface PerformanceMetrics {
  slow_queries: Array<{
    query: string;
    calls: number;
    total_time: number;
    mean_time: number;
    rows: number;
  }>;
  table_stats: Array<{
    table_name: string;
    seq_scan: number;
    seq_tup_read: number;
    idx_scan: number;
    idx_tup_fetch: number;
    n_tup_ins: number;
    n_tup_upd: number;
    n_tup_del: number;
  }>;
  index_usage: Array<{
    schemaname: string;
    tablename: string;
    indexname: string;
    idx_scan: number;
    idx_tup_read: number;
    idx_tup_fetch: number;
  }>;
}

const DatabaseManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Database data
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  
  // UI state
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [backupDescription, setBackupDescription] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication
  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      navigate('/admin/login');
      return;
    }
    loadDatabaseData();
  }, [user, navigate]);

  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      
      // Load all database information
      const [statsResponse, tablesResponse, backupsResponse, performanceResponse] = await Promise.allSettled([
        Api.get<DatabaseStats>('/database/stats'),
        Api.get<TableInfo[]>('/database/tables'),
        Api.get<BackupInfo[]>('/database/backups'),
        Api.get<PerformanceMetrics>('/database/performance')
      ]);

      if (statsResponse.status === 'fulfilled') {
        setDatabaseStats(statsResponse.value);
      }

      if (tablesResponse.status === 'fulfilled') {
        setTables(tablesResponse.value);
      }

      if (backupsResponse.status === 'fulfilled') {
        setBackups(backupsResponse.value);
      }

      if (performanceResponse.status === 'fulfilled') {
        setPerformanceMetrics(performanceResponse.value);
      }

    } catch (error) {
      console.error('Failed to load database data:', error);
      toast({
        title: "Error",
        description: "Failed to load database information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      
      const response = await Api.post('/database/backup', {
        type: 'manual',
        description: backupDescription || 'Manual backup'
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Database backup created successfully",
        });
        setBackupDescription('');
        loadDatabaseData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast({
        title: "Error",
        description: "Failed to create database backup",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setIsOptimizing(true);
      
      const response = await Api.post('/database/optimize');

      if (response.success) {
        toast({
          title: "Success",
          description: "Database optimization completed successfully",
        });
        loadDatabaseData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to optimize database:', error);
      toast({
        title: "Error",
        description: "Failed to optimize database",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate('/admin/login');
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const filteredTables = tables.filter(table =>
    table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading database information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Database Management</h1>
              <p className="text-muted-foreground">Monitor and manage your database</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Super Admin</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="backups">Backups</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{databaseStats?.total_tables || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatFileSize(databaseStats?.total_size_mb || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{databaseStats?.connection_count || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatUptime(databaseStats?.uptime_seconds || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Database Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Database Information</CardTitle>
                  <CardDescription>Current database configuration and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Version</Label>
                      <p className="text-sm text-muted-foreground">{databaseStats?.version || 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Rows</Label>
                      <p className="text-sm text-muted-foreground">
                        {(databaseStats?.total_rows || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tables Tab */}
            <TabsContent value="tables" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Database Tables</CardTitle>
                  <CardDescription>Overview of all database tables and their statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tables..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTables.map((table) => (
                        <TableRow key={table.table_name}>
                          <TableCell>
                            <div className="font-medium">{table.table_name}</div>
                            <div className="text-sm text-muted-foreground">{table.table_schema}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{table.table_type}</Badge>
                          </TableCell>
                          <TableCell>{table.row_count.toLocaleString()}</TableCell>
                          <TableCell>{formatFileSize(table.size_mb)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Schema
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Optimize
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backups Tab */}
            <TabsContent value="backups" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Database Backups</CardTitle>
                  <CardDescription>Create and manage database backups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Backup description (optional)"
                        value={backupDescription}
                        onChange={(e) => setBackupDescription(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                    >
                      {isCreatingBackup ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Create Backup
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>
                            <div className="font-medium">{backup.filename}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={backup.type === 'automatic' ? 'default' : 'secondary'}>
                              {backup.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(backup.size_mb)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                backup.status === 'completed' ? 'default' :
                                backup.status === 'failed' ? 'destructive' : 'secondary'
                              }
                            >
                              {backup.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {backup.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                              {backup.status === 'in_progress' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(backup.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Restore
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Table Statistics</CardTitle>
                    <CardDescription>Table access patterns and operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Seq Scans</TableHead>
                          <TableHead>Index Scans</TableHead>
                          <TableHead>Inserts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceMetrics?.table_stats.slice(0, 5).map((stat) => (
                          <TableRow key={stat.table_name}>
                            <TableCell className="font-medium">{stat.table_name}</TableCell>
                            <TableCell>{stat.seq_scan.toLocaleString()}</TableCell>
                            <TableCell>{stat.idx_scan.toLocaleString()}</TableCell>
                            <TableCell>{stat.n_tup_ins.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Index Usage</CardTitle>
                    <CardDescription>Most frequently used indexes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Index</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Scans</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceMetrics?.index_usage.slice(0, 5).map((index) => (
                          <TableRow key={`${index.tablename}-${index.indexname}`}>
                            <TableCell className="font-medium">{index.indexname}</TableCell>
                            <TableCell>{index.tablename}</TableCell>
                            <TableCell>{index.idx_scan.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Database Optimization</CardTitle>
                    <CardDescription>Optimize database performance and reclaim space</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Run VACUUM and ANALYZE on all tables to optimize performance and update statistics.
                    </p>
                    <Button 
                      onClick={handleOptimizeDatabase}
                      disabled={isOptimizing}
                      className="w-full"
                    >
                      {isOptimizing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Optimize Database
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                    <CardDescription>Database health indicators</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Connection Pool</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Query Performance</span>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Good
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage Usage</span>
                      <Badge variant="secondary">
                        <Gauge className="h-3 w-3 mr-1" />
                        Moderate
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagement;