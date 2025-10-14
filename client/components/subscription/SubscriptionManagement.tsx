import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import BillingHistory from './BillingHistory';
import PaymentMethods from './PaymentMethods';
import PlanManagement from './PlanManagement';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard,
  Building,
  Smartphone,
  Crown,
  Star,
  Zap
} from 'lucide-react';

interface Subscription {
  id: string;
  schoolId: string;
  schoolName: string;
  planType: 'basic' | 'standard' | 'premium';
  status: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trial';
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  usageStats: {
    students: number;
    teachers: number;
    storage: number;
    maxStudents: number;
    maxTeachers: number;
    maxStorage: number;
  };
  paymentMethod: string;
  autoRenewal: boolean;
  trialDaysLeft?: number;
  lastPaymentDate?: string;
  nextPaymentAmount: number;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  suspendedSubscriptions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  conversionRate: number;
}

const SubscriptionManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState({
    schoolId: '',
    schoolName: '',
    planType: 'basic' as 'basic' | 'standard' | 'premium',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    status: 'active' as 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trial'
  });
  const [editSubscription, setEditSubscription] = useState({
    planType: 'basic' as 'basic' | 'standard' | 'premium',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    status: 'active' as 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trial',
    nextBillingDate: '',
    notes: ''
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // Initialize edit form when dialog opens
  useEffect(() => {
    if (selectedSubscription && isEditDialogOpen) {
      setEditSubscription({
        planType: selectedSubscription.planType,
        billingCycle: selectedSubscription.billingCycle,
        status: selectedSubscription.status,
        nextBillingDate: selectedSubscription.nextBillingDate,
        notes: ''
      });
    }
  }, [selectedSubscription, isEditDialogOpen]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockSubscriptions: Subscription[] = [
        {
          id: '1',
          schoolId: 'school-1',
          schoolName: 'Lusaka Primary School',
          planType: 'premium',
          status: 'active',
          startDate: '2024-01-15',
          endDate: '2025-01-15',
          nextBillingDate: '2024-04-15',
          monthlyPrice: 299,
          yearlyPrice: 2990,
          billingCycle: 'monthly',
          features: ['Unlimited Students', 'Advanced Analytics', 'Priority Support', 'Custom Branding'],
          usageStats: {
            students: 850,
            teachers: 45,
            storage: 15.2,
            maxStudents: 1000,
            maxTeachers: 50,
            maxStorage: 50
          },
          paymentMethod: 'Credit Card (**** 4242)',
          autoRenewal: true,
          lastPaymentDate: '2024-03-15',
          nextPaymentAmount: 299
        },
        {
          id: '2',
          schoolId: 'school-2',
          schoolName: 'Ndola Secondary School',
          planType: 'standard',
          status: 'active',
          startDate: '2024-02-01',
          endDate: '2025-02-01',
          nextBillingDate: '2024-04-01',
          monthlyPrice: 199,
          yearlyPrice: 1990,
          billingCycle: 'yearly',
          features: ['Up to 500 Students', 'Basic Analytics', 'Email Support'],
          usageStats: {
            students: 320,
            teachers: 25,
            storage: 8.5,
            maxStudents: 500,
            maxTeachers: 30,
            maxStorage: 25
          },
          paymentMethod: 'Bank Transfer',
          autoRenewal: true,
          lastPaymentDate: '2024-02-01',
          nextPaymentAmount: 1990
        },
        {
          id: '3',
          schoolId: 'school-3',
          schoolName: 'Kitwe Combined School',
          planType: 'basic',
          status: 'trial',
          startDate: '2024-03-10',
          endDate: '2024-04-10',
          nextBillingDate: '2024-04-10',
          monthlyPrice: 99,
          yearlyPrice: 990,
          billingCycle: 'monthly',
          features: ['Up to 100 Students', 'Basic Features', 'Community Support'],
          usageStats: {
            students: 75,
            teachers: 8,
            storage: 2.1,
            maxStudents: 100,
            maxTeachers: 10,
            maxStorage: 10
          },
          paymentMethod: 'Not Set',
          autoRenewal: false,
          trialDaysLeft: 15,
          nextPaymentAmount: 99
        },
        {
          id: '4',
          schoolId: 'school-4',
          schoolName: 'Livingstone High School',
          planType: 'standard',
          status: 'suspended',
          startDate: '2023-12-01',
          endDate: '2024-12-01',
          nextBillingDate: '2024-03-01',
          monthlyPrice: 199,
          yearlyPrice: 1990,
          billingCycle: 'monthly',
          features: ['Up to 500 Students', 'Basic Analytics', 'Email Support'],
          usageStats: {
            students: 450,
            teachers: 28,
            storage: 18.7,
            maxStudents: 500,
            maxTeachers: 30,
            maxStorage: 25
          },
          paymentMethod: 'Credit Card (**** 1234)',
          autoRenewal: true,
          lastPaymentDate: '2024-02-01',
          nextPaymentAmount: 199
        }
      ];

      const mockStats: SubscriptionStats = {
        totalSubscriptions: 4,
        activeSubscriptions: 2,
        trialSubscriptions: 1,
        monthlyRevenue: 498,
        yearlyRevenue: 5970,
        churnRate: 5.2,
        averageRevenuePerUser: 199.2,
        conversionRate: 78.5
      };

      setSubscriptions(mockSubscriptions);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = 
      subscription.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.schoolId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.planType === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      suspended: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: Trash2 },
      trial: { color: 'bg-blue-100 text-blue-800', icon: Star }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    
    return (
      <Badge className={config?.color || 'bg-gray-100 text-gray-800'}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const planConfig = {
      basic: { color: 'bg-gray-100 text-gray-800', icon: Users },
      standard: { color: 'bg-blue-100 text-blue-800', icon: Zap },
      premium: { color: 'bg-purple-100 text-purple-800', icon: Crown }
    };
    
    const config = planConfig[planType as keyof typeof planConfig];
    const Icon = config?.icon || Users;
    
    return (
      <Badge className={config?.color || 'bg-gray-100 text-gray-800'}>
        <Icon className="w-3 h-3 mr-1" />
        {planType.charAt(0).toUpperCase() + planType.slice(1)}
      </Badge>
    );
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDetailsDialogOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsEditDialogOpen(true);
  };

  const handleSuspendSubscription = async (subscriptionId: string) => {
    if (confirm('Are you sure you want to suspend this subscription?')) {
      setSubscriptions(subs =>
        subs.map(sub =>
          sub.id === subscriptionId
            ? { ...sub, status: 'suspended' as const }
            : sub
        )
      );
    }
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    setSubscriptions(subs =>
      subs.map(sub =>
        sub.id === subscriptionId
          ? { ...sub, status: 'active' as const }
          : sub
      )
    );
  };

  const handleCreateSubscription = async () => {
    if (!newSubscription.schoolId || !newSubscription.schoolName) {
      alert('Please fill in all required fields');
      return;
    }

    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      schoolId: newSubscription.schoolId,
      schoolName: newSubscription.schoolName,
      planType: newSubscription.planType,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthlyPrice: newSubscription.planType === 'basic' ? 99 : newSubscription.planType === 'standard' ? 199 : 299,
      yearlyPrice: newSubscription.planType === 'basic' ? 990 : newSubscription.planType === 'standard' ? 1990 : 2990,
      billingCycle: newSubscription.billingCycle,
      features: newSubscription.planType === 'basic' 
        ? ['Up to 100 Students', 'Basic Features', 'Community Support']
        : newSubscription.planType === 'standard'
        ? ['Up to 500 Students', 'Basic Analytics', 'Email Support']
        : ['Unlimited Students', 'Advanced Analytics', 'Priority Support', 'Custom Branding'],
      usageStats: {
        students: 0,
        teachers: 0,
        storage: 0,
        maxStudents: newSubscription.planType === 'basic' ? 100 : newSubscription.planType === 'standard' ? 500 : 1000,
        maxTeachers: newSubscription.planType === 'basic' ? 10 : newSubscription.planType === 'standard' ? 30 : 50,
        maxStorage: newSubscription.planType === 'basic' ? 10 : newSubscription.planType === 'standard' ? 25 : 50
      },
      paymentMethod: 'Not Set',
      autoRenewal: true,
      nextPaymentAmount: newSubscription.billingCycle === 'monthly' 
        ? (newSubscription.planType === 'basic' ? 99 : newSubscription.planType === 'standard' ? 199 : 299)
        : (newSubscription.planType === 'basic' ? 990 : newSubscription.planType === 'standard' ? 1990 : 2990)
    };

    setSubscriptions(subs => [...subs, newSub]);
    setIsCreateDialogOpen(false);
    setNewSubscription({
      schoolId: '',
      schoolName: '',
      planType: 'basic',
      billingCycle: 'monthly'
    });

    // Update stats
    if (stats) {
      setStats({
        ...stats,
        totalSubscriptions: stats.totalSubscriptions + 1,
        activeSubscriptions: stats.activeSubscriptions + 1
      });
    }
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;

    // Create updated subscription with all the changes
    const updatedSubscription = {
      ...selectedSubscription,
      planType: editSubscription.planType,
      billingCycle: editSubscription.billingCycle,
      status: editSubscription.status,
      nextBillingDate: editSubscription.nextBillingDate,
      notes: editSubscription.notes,
      // Update pricing based on new plan
      monthlyPrice: editSubscription.planType === 'basic' ? 99 : editSubscription.planType === 'standard' ? 199 : 299,
      yearlyPrice: editSubscription.planType === 'basic' ? 990 : editSubscription.planType === 'standard' ? 1990 : 2990,
      nextPaymentAmount: editSubscription.billingCycle === 'monthly' 
        ? (editSubscription.planType === 'basic' ? 99 : editSubscription.planType === 'standard' ? 199 : 299)
        : (editSubscription.planType === 'basic' ? 990 : editSubscription.planType === 'standard' ? 1990 : 2990),
      // Update features based on new plan
      features: editSubscription.planType === 'basic' 
        ? ['Up to 100 Students', 'Basic Features', 'Community Support']
        : editSubscription.planType === 'standard'
        ? ['Up to 500 Students', 'Basic Analytics', 'Email Support']
        : ['Unlimited Students', 'Advanced Analytics', 'Priority Support', 'Custom Branding'],
      usageStats: {
        ...selectedSubscription.usageStats,
        maxStudents: editSubscription.planType === 'basic' ? 100 : editSubscription.planType === 'standard' ? 500 : 1000,
      }
    };

    // Update subscriptions state with the modified subscription
    setSubscriptions(prevSubscriptions => 
      prevSubscriptions.map(sub => 
        sub.id === selectedSubscription.id ? updatedSubscription : sub
      )
    );

    // Update stats if status changed
    if (selectedSubscription.status !== editSubscription.status && stats) {
      const newStats = { ...stats };
      
      // Handle status transitions
      if (selectedSubscription.status === 'cancelled' && editSubscription.status === 'active') {
        // Cancelled to active
        newStats.activeSubscriptions += 1;
        newStats.cancelledSubscriptions -= 1;
      } 
      else if (selectedSubscription.status === 'active' && editSubscription.status === 'cancelled') {
        // Active to cancelled
        newStats.activeSubscriptions -= 1;
        newStats.cancelledSubscriptions += 1;
      }
      else if (selectedSubscription.status === 'suspended' && editSubscription.status === 'active') {
        // Suspended to active
        newStats.activeSubscriptions += 1;
        newStats.suspendedSubscriptions -= 1;
      }
      else if (selectedSubscription.status === 'active' && editSubscription.status === 'suspended') {
        // Active to suspended
        newStats.activeSubscriptions -= 1;
        newStats.suspendedSubscriptions += 1;
      }
      
      setStats(newStats);
    }

    // Close the dialog
    setIsEditDialogOpen(false);
  };

  const getUsagePercentage = (used: number, max: number) => {
    return Math.round((used / max) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage school subscriptions, billing, and plans</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
                  <p className="text-xs text-muted-foreground">{stats.activeSubscriptions} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">K{stats.monthlyRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Trial to paid conversion</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">K{stats.averageRevenuePerUser}</div>
                  <p className="text-xs text-muted-foreground">Average revenue per user</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>Manage all school subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subscription.schoolName}</div>
                          <div className="text-sm text-muted-foreground">{subscription.schoolId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(subscription.planType)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(subscription.status)}
                          {subscription.status === 'trial' && subscription.trialDaysLeft && (
                            <div className="text-xs text-muted-foreground">
                              {subscription.trialDaysLeft} days left
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            K{subscription.billingCycle === 'monthly' ? subscription.monthlyPrice : subscription.yearlyPrice}
                            /{subscription.billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {subscription.billingCycle}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {subscription.usageStats.students}/{subscription.usageStats.maxStudents} students
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ 
                                width: `${getUsagePercentage(subscription.usageStats.students, subscription.usageStats.maxStudents)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">K{subscription.nextPaymentAmount}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(subscription.nextBillingDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(subscription)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditSubscription(subscription)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {subscription.status === 'active' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSuspendSubscription(subscription.id)}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          ) : subscription.status === 'suspended' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReactivateSubscription(subscription.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <PlanManagement />
        </TabsContent>

        <TabsContent value="billing">
          <BillingHistory />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentMethods />
        </TabsContent>
      </Tabs>

      {/* Subscription Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.schoolName} - {selectedSubscription?.planType} Plan
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">School Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedSubscription.schoolName}</div>
                    <div><strong>ID:</strong> {selectedSubscription.schoolId}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedSubscription.status)}</div>
                    <div><strong>Plan:</strong> {getPlanBadge(selectedSubscription.planType)}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Billing Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Billing Cycle:</strong> {selectedSubscription.billingCycle}</div>
                    <div><strong>Current Price:</strong> K{selectedSubscription.billingCycle === 'monthly' ? selectedSubscription.monthlyPrice : selectedSubscription.yearlyPrice}</div>
                    <div><strong>Next Payment:</strong> K{selectedSubscription.nextPaymentAmount}</div>
                    <div><strong>Next Billing:</strong> {new Date(selectedSubscription.nextBillingDate).toLocaleDateString()}</div>
                    <div><strong>Auto Renewal:</strong> {selectedSubscription.autoRenewal ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="font-semibold mb-2">Usage Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Students</div>
                    <div className="text-2xl font-bold">{selectedSubscription.usageStats.students}</div>
                    <div className="text-xs text-muted-foreground">
                      of {selectedSubscription.usageStats.maxStudents} max
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${getUsagePercentage(selectedSubscription.usageStats.students, selectedSubscription.usageStats.maxStudents)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Teachers</div>
                    <div className="text-2xl font-bold">{selectedSubscription.usageStats.teachers}</div>
                    <div className="text-xs text-muted-foreground">
                      of {selectedSubscription.usageStats.maxTeachers} max
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${getUsagePercentage(selectedSubscription.usageStats.teachers, selectedSubscription.usageStats.maxTeachers)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Storage</div>
                    <div className="text-2xl font-bold">{selectedSubscription.usageStats.storage}GB</div>
                    <div className="text-xs text-muted-foreground">
                      of {selectedSubscription.usageStats.maxStorage}GB max
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ 
                          width: `${getUsagePercentage(selectedSubscription.usageStats.storage, selectedSubscription.usageStats.maxStorage)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-semibold mb-2">Plan Features</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSubscription.features.map((feature, index) => (
                    <Badge key={index} variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => handleEditSubscription(selectedSubscription)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Subscription
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
                {selectedSubscription.status === 'active' ? (
                  <Button variant="destructive" onClick={() => handleSuspendSubscription(selectedSubscription.id)}>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Suspend
                  </Button>
                ) : selectedSubscription.status === 'suspended' ? (
                  <Button variant="default" onClick={() => handleReactivateSubscription(selectedSubscription.id)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Reactivate
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update subscription details for {selectedSubscription?.schoolName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select 
                  value={editSubscription.planType} 
                  onValueChange={(value: 'basic' | 'standard' | 'premium') => 
                    setEditSubscription(prev => ({ ...prev, planType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Plan</SelectItem>
                    <SelectItem value="standard">Standard Plan</SelectItem>
                    <SelectItem value="premium">Premium Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select 
                  value={editSubscription.billingCycle} 
                  onValueChange={(value: 'monthly' | 'yearly') => 
                    setEditSubscription(prev => ({ ...prev, billingCycle: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editSubscription.status} 
                  onValueChange={(value: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trial') => 
                    setEditSubscription(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next Billing Date</Label>
                <Input 
                  type="date" 
                  value={editSubscription.nextBillingDate}
                  onChange={(e) => setEditSubscription(prev => ({ ...prev, nextBillingDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Add any notes about this subscription..." 
                  value={editSubscription.notes}
                  onChange={(e) => setEditSubscription(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleUpdateSubscription} className="flex-1">
                  Update Subscription
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subscription</DialogTitle>
            <DialogDescription>
              Add a new subscription for a school
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>School ID</Label>
              <Input 
                placeholder="Enter school ID"
                value={newSubscription.schoolId}
                onChange={(e) => setNewSubscription(prev => ({ ...prev, schoolId: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>School Name</Label>
              <Input 
                placeholder="Enter school name"
                value={newSubscription.schoolName}
                onChange={(e) => setNewSubscription(prev => ({ ...prev, schoolName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select 
                value={newSubscription.planType} 
                onValueChange={(value: 'basic' | 'standard' | 'premium') => 
                  setNewSubscription(prev => ({ ...prev, planType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Plan - K99/month</SelectItem>
                  <SelectItem value="standard">Standard Plan - K199/month</SelectItem>
                  <SelectItem value="premium">Premium Plan - K299/month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select 
                value={newSubscription.billingCycle} 
                onValueChange={(value: 'monthly' | 'yearly') => 
                  setNewSubscription(prev => ({ ...prev, billingCycle: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly (10% discount)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateSubscription} className="flex-1">
                Create Subscription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement;