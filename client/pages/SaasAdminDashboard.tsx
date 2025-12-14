import { useState, useEffect } from 'react';
import { Building, Users, CreditCard, Search, Plus, MoreHorizontal, Filter, TrendingUp, TrendingDown, BarChart3, Activity, DollarSign, Calendar, Bell, Zap, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Api } from '@/lib/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface School {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  subscriptionType: 'basic' | 'standard' | 'premium';
  userCount: number;
  createdAt: string;
  phone?: string;
  address?: string;
  district?: string;
  province?: string;
}

interface Subscription {
  id: string;
  schoolId?: string;
  schoolName: string;
  plan: 'basic' | 'standard' | 'premium';
  status: 'active' | 'trial' | 'expired';
  startDate: string;
  endDate: string;
  amount?: number;
  userCount?: number;
  monthlyRevenue?: number;
}

interface DashboardStats {
  totalSchools: number;
  activeSubscriptions: number;
  totalUsers: number;
  monthlyGrowth: {
    schools: number;
    subscriptions: number;
    users: number;
  };
  revenue: {
    total: number;
    monthly: number;
    growth: number;
  };
  systemHealth: {
    uptime: number;
    activeConnections: number;
    responseTime: number;
  };
}

interface EnhancedAnalytics {
  subscriptionDistribution: {
    basic: number;
    standard: number;
    premium: number;
  };
  userActivity: {
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
  };
  schoolPerformance: {
    topPerforming: Array<{
      name: string;
      score: number;
      users: number;
    }>;
    averageEngagement: number;
  };
}

export default function SaasAdminDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalSchools: 0,
    activeSubscriptions: 0,
    totalUsers: 0,
    monthlyGrowth: {
      schools: 0,
      subscriptions: 0,
      users: 0
    },
    revenue: {
      total: 0,
      monthly: 0,
      growth: 0
    },
    systemHealth: {
      uptime: 0,
      activeConnections: 0,
      responseTime: 0
    }
  });
  const [analytics, setAnalytics] = useState<EnhancedAnalytics>({
    subscriptionDistribution: {
      basic: 0,
      standard: 0,
      premium: 0
    },
    userActivity: {
      dailyActive: 0,
      weeklyActive: 0,
      monthlyActive: 0
    },
    schoolPerformance: {
      topPerforming: [],
      averageEngagement: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch real data from API
  useEffect(() => {
    loadDashboardData();
    loadAnalyticsData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await Api.get<DashboardStats>('/dashboard/stats');
      setDashboardStats(statsResponse);
      
      // Fetch schools data
      const schoolsResponse = await Api.get<School[]>('/dashboard/schools');
      setSchools(schoolsResponse);
      
      // Fetch subscriptions data
      const subscriptionsResponse = await Api.get<Subscription[]>('/dashboard/subscriptions');
      setSubscriptions(subscriptionsResponse);
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      
      // Fallback to mock data for development
      setDashboardStats({
        totalSchools: 156,
        activeSubscriptions: 142,
        totalUsers: 2340,
        monthlyGrowth: {
          schools: 12,
          subscriptions: 8,
          users: 234
        },
        revenue: {
          total: 45600,
          monthly: 12800,
          growth: 15.2
        },
        systemHealth: {
          uptime: 99.8,
          activeConnections: 1250,
          responseTime: 120
        }
      });
      
      setSchools([
        {
          id: '1',
          name: 'Lusaka Primary School',
          email: 'admin@lusakaprimary.edu.zm',
          subscriptionStatus: 'active',
          subscriptionType: 'premium',
          userCount: 45,
          createdAt: '2024-01-15T00:00:00Z',
          phone: '+260-211-123456',
          address: 'Plot 123, Great East Road',
          district: 'Lusaka',
          province: 'Lusaka'
        },
        {
          id: '2',
          name: 'Ndola Secondary School',
          email: 'info@ndolasecondary.edu.zm',
          subscriptionStatus: 'active',
          subscriptionType: 'standard',
          userCount: 32,
          createdAt: '2024-02-01T00:00:00Z',
          phone: '+260-212-987654',
          address: 'Broadway Street',
          district: 'Ndola',
          province: 'Copperbelt'
        }
      ]);
      
      setSubscriptions([
        {
          id: '1',
          schoolName: 'Lusaka Primary School',
          plan: 'premium',
          status: 'active',
          startDate: '2024-01-15',
          endDate: '2024-12-15',
          userCount: 45,
          monthlyRevenue: 299
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Initialize with default values first to prevent undefined errors
      setAnalytics({
        subscriptionDistribution: {
          basic: 0,
          standard: 0,
          premium: 0
        },
        userActivity: {
          dailyActive: 0,
          weeklyActive: 0,
          monthlyActive: 0
        },
        schoolPerformance: {
          topPerforming: [
            { name: 'Lusaka Primary', score: 95, users: 45 },
            { name: 'Ndola Secondary', score: 92, users: 32 },
            { name: 'Kitwe High School', score: 89, users: 28 }
          ],
          averageEngagement: 78.5
        }
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'expired':
        return <Badge className="bg-red-500">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'basic':
        return <Badge variant="outline">Basic</Badge>;
      case 'standard':
        return <Badge variant="secondary">Standard</Badge>;
      case 'premium':
        return <Badge variant="default">Premium</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    school.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
  );



  if (loading) {
    return (
      <DashboardLayout
        icon={<BarChart3 className="h-6 w-6" />}
        title="Admin Dashboard"
        description="System overview and analytics"
        isAdmin={true}
        activeTab="dashboard"
      >
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      icon={<BarChart3 className="h-6 w-6" />}
      title="Admin Dashboard"
      description="System overview and analytics"
      isAdmin={true}
      activeTab="dashboard"
    >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="notifications">
                <div className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Enhanced Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardStats.totalSchools}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {dashboardStats.monthlyGrowth.schools >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      )}
                      {Math.abs(dashboardStats.monthlyGrowth.schools)} from last month
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardStats.activeSubscriptions}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {dashboardStats.monthlyGrowth.subscriptions >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      )}
                      {Math.abs(dashboardStats.monthlyGrowth.subscriptions)} from last month
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardStats.totalUsers}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {dashboardStats.monthlyGrowth.users >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      )}
                      {Math.abs(dashboardStats.monthlyGrowth.users)} from last month
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${dashboardStats.revenue?.monthly?.toLocaleString() || '0'}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {dashboardStats.revenue?.growth >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                      )}
                      {Math.abs(dashboardStats.revenue?.growth || 0)}% from last month
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* System Health and Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      System Health
                    </CardTitle>
                    <CardDescription>Real-time system performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>System Uptime</span>
                        <span className="font-medium">{dashboardStats.systemHealth?.uptime || 0}%</span>
                      </div>
                      <Progress value={dashboardStats.systemHealth?.uptime || 0} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-muted-foreground">Active Connections</p>
                          <p className="text-2xl font-bold">{dashboardStats.systemHealth?.activeConnections || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Response Time</p>
                          <p className="text-2xl font-bold">{dashboardStats.systemHealth?.responseTime || 0}ms</p>
                        </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Top Performing Schools
                    </CardTitle>
                    <CardDescription>Schools with highest engagement rates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.schoolPerformance.topPerforming.map((school, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{school.name}</p>
                              <p className="text-sm text-muted-foreground">{school.users} users</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{school.score}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system events and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <p className="font-medium">New school registration</p>
                        <p className="text-sm text-muted-foreground">Kitwe High School joined the platform</p>
                      </div>
                      <span className="text-sm text-muted-foreground">2 hours ago</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <p className="font-medium">Subscription upgrade</p>
                        <p className="text-sm text-muted-foreground">Lusaka Primary upgraded to Premium plan</p>
                      </div>
                      <span className="text-sm text-muted-foreground">5 hours ago</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div className="flex-1">
                        <p className="font-medium">System maintenance</p>
                        <p className="text-sm text-muted-foreground">Scheduled maintenance completed successfully</p>
                      </div>
                      <span className="text-sm text-muted-foreground">1 day ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* User Activity Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>Active users across different time periods</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Daily Active Users</span>
                        <span className="text-2xl font-bold">{analytics.userActivity.dailyActive}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Weekly Active Users</span>
                        <span className="text-2xl font-bold">{analytics.userActivity.weeklyActive}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Monthly Active Users</span>
                        <span className="text-2xl font-bold">{analytics.userActivity.monthlyActive}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription Distribution</CardTitle>
                    <CardDescription>Breakdown of subscription plans</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Basic Plan</span>
                          <span className="font-medium">{analytics.subscriptionDistribution.basic}</span>
                        </div>
                        <Progress value={analytics.subscriptionDistribution.basic / 1.56} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Standard Plan</span>
                          <span className="font-medium">{analytics.subscriptionDistribution.standard}</span>
                        </div>
                        <Progress value={analytics.subscriptionDistribution.standard / 1.56} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Premium Plan</span>
                          <span className="font-medium">{analytics.subscriptionDistribution.premium}</span>
                        </div>
                        <Progress value={analytics.subscriptionDistribution.premium / 1.56} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Financial performance and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-3xl font-bold">${dashboardStats.revenue?.total?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                      <p className="text-3xl font-bold">${dashboardStats.revenue?.monthly?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                      <p className="text-3xl font-bold text-green-600">+{dashboardStats.revenue?.growth || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

             <TabsContent value="schools" className="space-y-6">
               {/* Search and Filter */}
               <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="relative flex-1">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search schools..."
                     className="pl-8"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <Button>
                   <Filter className="mr-2 h-4 w-4" />
                   Filter
                 </Button>
                 <Button variant="default">
                   <Plus className="mr-2 h-4 w-4" />
                   Add School
                 </Button>
               </div>

               <Card>
                 <CardHeader>
                   <CardTitle>Schools Management</CardTitle>
                   <CardDescription>
                     Manage all registered schools in the system.
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>School Name</TableHead>
                         <TableHead>Email</TableHead>
                         <TableHead>Subscription</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Users</TableHead>
                         <TableHead>Created</TableHead>
                         <TableHead></TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {filteredSchools.map((school) => (
                         <TableRow key={school.id}>
                           <TableCell className="font-medium">{school.name}</TableCell>
                           <TableCell>{school.email}</TableCell>
                           <TableCell>{getPlanBadge(school.subscriptionType)}</TableCell>
                           <TableCell>{getStatusBadge(school.subscriptionStatus)}</TableCell>
                           <TableCell>{school.userCount}</TableCell>
                           <TableCell>{new Date(school.createdAt).toLocaleDateString()}</TableCell>
                           <TableCell>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon">
                                   <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem>View Details</DropdownMenuItem>
                                 <DropdownMenuItem>Edit School</DropdownMenuItem>
                                 <DropdownMenuItem>Manage Users</DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem className="text-red-500">Suspend School</DropdownMenuItem>
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

             <TabsContent value="subscriptions" className="space-y-6">
               {/* Search and Filter */}
               <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="relative flex-1">
                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search subscriptions..."
                     className="pl-8"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                 </div>
                 <Button>
                   <Filter className="mr-2 h-4 w-4" />
                   Filter
                 </Button>
               </div>

               <Card>
                 <CardHeader>
                   <CardTitle>Subscriptions Management</CardTitle>
                   <CardDescription>
                     Manage all subscription plans and payments.
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>School</TableHead>
                         <TableHead>Plan</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Start Date</TableHead>
                         <TableHead>End Date</TableHead>
                         <TableHead>Users</TableHead>
                         <TableHead></TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {filteredSubscriptions.map((sub) => (
                         <TableRow key={sub.id}>
                           <TableCell className="font-medium">{sub.schoolName}</TableCell>
                           <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                           <TableCell>{getStatusBadge(sub.status)}</TableCell>
                           <TableCell>{new Date(sub.startDate).toLocaleDateString()}</TableCell>
                           <TableCell>{new Date(sub.endDate).toLocaleDateString()}</TableCell>
                           <TableCell>{sub.userCount || 0}</TableCell>
                           <TableCell>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon">
                                   <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem>View Details</DropdownMenuItem>
                                 <DropdownMenuItem>Edit Subscription</DropdownMenuItem>
                                 <DropdownMenuItem>Extend Subscription</DropdownMenuItem>
                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem className="text-red-500">Cancel Subscription</DropdownMenuItem>
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


           </Tabs>
    </DashboardLayout>
  );
 }