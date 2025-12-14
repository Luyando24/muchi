import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Activity, 
  HardDrive,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Zap,
  Server,
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

// Mock data for development
const mockDatabaseStats: DatabaseStats = {
  total_tables: 25,
  total_size_mb: 1024.5,
  total_rows: 150000,
  connection_count: 12,
  uptime_seconds: 2592000, // 30 days
  version: 'PostgreSQL 14.9'
};

const mockTables: TableInfo[] = [
  {
    table_name: 'users',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 5420,
    size_mb: 45.2
  },
  {
    table_name: 'schools',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 150,
    size_mb: 12.8
  },
  {
    table_name: 'students',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 25000,
    size_mb: 180.5
  },
  {
    table_name: 'teachers',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 1200,
    size_mb: 28.3
  },
  {
    table_name: 'classes',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 800,
    size_mb: 15.7
  },
  {
    table_name: 'subscriptions',
    table_schema: 'public',
    table_type: 'BASE TABLE',
    row_count: 150,
    size_mb: 8.2
  }
];

const mockBackups: BackupInfo[] = [
  {
    id: '1',
    filename: 'muchi_backup_2024_01_15.sql',
    size_mb: 256.8,
    created_at: '2024-01-15T10:30:00Z',
    type: 'automatic',
    status: 'completed'
  },
  {
    id: '2',
    filename: 'muchi_backup_2024_01_14.sql',
    size_mb: 248.3,
    created_at: '2024-01-14T10:30:00Z',
    type: 'automatic',
    status: 'completed'
  },
  {
    id: '3',
    filename: 'manual_backup_pre_update.sql',
    size_mb: 245.1,
    created_at: '2024-01-13T15:45:00Z',
    type: 'manual',
    status: 'completed'
  }
];

const mockPerformanceMetrics: PerformanceMetrics = {
  slow_queries: [
    {
      query: 'SELECT * FROM students WHERE grade = ? AND school_id = ?',
      calls: 1250,
      total_time: 45.2,
      mean_time: 0.036,
      rows: 25000
    },
    {
      query: 'SELECT COUNT(*) FROM attendance WHERE date BETWEEN ? AND ?',
      calls: 890,
      total_time: 32.1,
      mean_time: 0.036,
      rows: 15000
    }
  ],
  table_stats: [
    {
      table_name: 'students',
      seq_scan: 125,
      seq_tup_read: 3125000,
      idx_scan: 8950,
      idx_tup_fetch: 89500,
      n_tup_ins: 450,
      n_tup_upd: 1200,
      n_tup_del: 25
    },
    {
      table_name: 'users',
      seq_scan: 45,
      seq_tup_read: 243900,
      idx_scan: 12500,
      idx_tup_fetch: 67750,
      n_tup_ins: 120,
      n_tup_upd: 890,
      n_tup_del: 15
    }
  ],
  index_usage: [
    {
      schemaname: 'public',
      tablename: 'students',
      indexname: 'idx_students_school_id',
      idx_scan: 5420,
      idx_tup_read: 54200,
      idx_tup_fetch: 25000
    },
    {
      schemaname: 'public',
      tablename: 'users',
      indexname: 'idx_users_email',
      idx_scan: 8950,
      idx_tup_read: 8950,
      idx_tup_fetch: 8950
    }
  ]
};

const DatabaseManagement: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Database data
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>(mockDatabaseStats);
  const [tables, setTables] = useState<TableInfo[]>(mockTables);
  const [backups, setBackups] = useState<BackupInfo[]>(mockBackups);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(mockPerformanceMetrics);
  
  // UI state
  const [backupDescription, setBackupDescription] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Check authentication
  useEffect(() => {
    const user = session?.user;
    if (!user || user.role !== 'superadmin') {
      navigate('/admin/login');
      return;
    }
    loadDatabaseData();
  }, [session, navigate]);

  const loadDatabaseData = async () => {
    try {
      setLoading(true);
      
      // In a real application, these would be actual API calls
      // For now, we'll use mock data with a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock API responses
      setDatabaseStats(mockDatabaseStats);
      setTables(mockTables);
      setBackups(mockBackups);
      setPerformanceMetrics(mockPerformanceMetrics);

      console.log('Database data loaded successfully');
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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newBackup: BackupInfo = {
        id: Date.now().toString(),
        filename: `manual_backup_${new Date().toISOString().split('T')[0]}.sql`,
        size_mb: Math.random() * 100 + 200,
        created_at: new Date().toISOString(),
        type: 'manual',
        status: 'completed'
      };

      setBackups(prev => [newBackup, ...prev]);
      
      toast({
        title: "Success",
        description: "Database backup created successfully",
      });
      setBackupDescription('');
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
      
      // Simulate optimization process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Success",
        description: "Database optimization completed successfully",
      });
      
      // Refresh data after optimization
      loadDatabaseData();
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

  const handleDeleteBackup = async (backupId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setBackups(prev => prev.filter(backup => backup.id !== backupId));
      
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast({
        title: "Error",
        description: "Failed to delete backup",
        variant: "destructive",
      });
    }
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
    <DashboardLayout 
      title="Database Management" 
      subtitle="Monitor and manage your database"
      isAdmin={true}
      activeTab="database"
    >
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="backups">Backup & Restore</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
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
                  <div className="text-2xl font-bold">{databaseStats.total_tables}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatFileSize(databaseStats.total_size_mb)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{databaseStats.connection_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatUptime(databaseStats.uptime_seconds)}
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
                    <p className="text-sm text-muted-foreground">{databaseStats.version}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Total Rows</Label>
                    <p className="text-sm text-muted-foreground">
                      {databaseStats.total_rows.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common database management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    onClick={handleOptimizeDatabase}
                    disabled={isOptimizing}
                    variant="outline"
                  >
                    {isOptimizing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Optimize Database
                  </Button>
                  <Button 
                    onClick={loadDatabaseData}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </Button>
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

                <div className="rounded-md border">
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
                </div>
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

                <div className="rounded-md border">
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
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteBackup(backup.id)}
                                >
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Slow Queries</CardTitle>
                  <CardDescription>Queries that may need optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceMetrics.slow_queries.map((query, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="font-mono text-sm mb-2 bg-muted p-2 rounded">
                          {query.query}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Calls:</span> {query.calls}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mean Time:</span> {query.mean_time.toFixed(3)}ms
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Time:</span> {query.total_time.toFixed(1)}s
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rows:</span> {query.rows.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Table Statistics</CardTitle>
                  <CardDescription>Table access patterns and operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
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
                        {performanceMetrics.table_stats.map((stat) => (
                          <TableRow key={stat.table_name}>
                            <TableCell className="font-medium">{stat.table_name}</TableCell>
                            <TableCell>{stat.seq_scan.toLocaleString()}</TableCell>
                            <TableCell>{stat.idx_scan.toLocaleString()}</TableCell>
                            <TableCell>{stat.n_tup_ins.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Index Usage</CardTitle>
                <CardDescription>Database index performance and usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table</TableHead>
                        <TableHead>Index</TableHead>
                        <TableHead>Scans</TableHead>
                        <TableHead>Tuples Read</TableHead>
                        <TableHead>Tuples Fetched</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceMetrics.index_usage.map((index, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{index.tablename}</TableCell>
                          <TableCell>{index.indexname}</TableCell>
                          <TableCell>{index.idx_scan.toLocaleString()}</TableCell>
                          <TableCell>{index.idx_tup_read.toLocaleString()}</TableCell>
                          <TableCell>{index.idx_tup_fetch.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DatabaseManagement;