import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Building, 
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpCircle,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Mock data and hooks (replace with actual implementations)
const mockSubscriptions = [
  {
    id: '1',
    schoolName: 'Greenwood High School',
    planType: 'premium',
    status: 'active',
    users: 150,
    revenue: 2500,
    nextBillingDate: '2024-02-15',
    startDate: '2023-02-15',
    endDate: '2024-02-15'
  },
  {
    id: '2',
    schoolName: 'Riverside Elementary',
    planType: 'basic',
    status: 'trial',
    users: 75,
    revenue: 1200,
    nextBillingDate: '2024-01-30',
    startDate: '2024-01-01',
    endDate: '2024-01-30'
  },
  {
    id: '3',
    schoolName: 'Mountain View Academy',
    planType: 'enterprise',
    status: 'active',
    users: 300,
    revenue: 5000,
    nextBillingDate: '2024-03-01',
    startDate: '2023-03-01',
    endDate: '2024-03-01'
  }
];

const mockPlans = [
  { id: '1', name: 'Basic', price: 1200, features: ['Up to 100 users', 'Basic reporting', 'Email support'] },
  { id: '2', name: 'Premium', price: 2500, features: ['Up to 200 users', 'Advanced reporting', 'Priority support', 'Custom branding'] },
  { id: '3', name: 'Enterprise', price: 5000, features: ['Unlimited users', 'Full analytics', '24/7 support', 'Custom integrations'] }
];

const mockBillingHistory = [
  { id: '1', date: '2024-01-15', amount: 2500, status: 'paid', invoice: 'INV-001' },
  { id: '2', date: '2023-12-15', amount: 2500, status: 'paid', invoice: 'INV-002' },
  { id: '3', date: '2023-11-15', amount: 1200, status: 'failed', invoice: 'INV-003' }
];

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  
  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Create subscription form state
  const [createForm, setCreateForm] = useState({
    schoolId: '',
    plan: '',
    billingCycle: 'monthly',
    users: 1,
    startDate: new Date().toISOString().split('T')[0],
    paymentMethod: ''
  });

  // Upgrade subscription form state
  const [upgradeForm, setUpgradeForm] = useState({
    plan: '',
    billingCycle: 'monthly'
  });

  // Mock data (replace with actual API calls)
  const subscriptions = mockSubscriptions;
  const plans = mockPlans;
  const billingHistory = mockBillingHistory;

  // Calculated values
  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.revenue, 0);
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(sub => sub.status === 'trial').length;
  const totalUsers = subscriptions.reduce((sum, sub) => sum + sub.users, 0);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.planType === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleLogout = async () => {
    await clearSession();
    navigate('/login');
  };

  const handleCreateSubscription = async () => {
    if (!createForm.schoolId || !createForm.plan) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Mock API call - replace with actual implementation
      console.log('Creating subscription:', createForm);
      setIsCreateDialogOpen(false);
      setCreateForm({
        schoolId: '',
        plan: '',
        billingCycle: 'monthly',
        users: 1,
        startDate: new Date().toISOString().split('T')[0],
        paymentMethod: ''
      });
    } catch (error) {
      console.error('Failed to create subscription:', error);
      alert('Failed to create subscription. Please try again.');
    }
  };

  const handleUpgradeSubscription = async () => {
    if (!selectedSubscription || !upgradeForm.plan) return;

    try {
      // Mock API call - replace with actual implementation
      console.log('Upgrading subscription:', selectedSubscription.id, upgradeForm);
      setIsUpgradeDialogOpen(false);
      setUpgradeForm({ plan: '', billingCycle: 'monthly' });
      setSelectedSubscription(null);
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      alert('Failed to upgrade subscription. Please try again.');
    }
  };

  const handleViewDetails = (subscription) => {
    setSelectedSubscription(subscription);
    setIsViewDialogOpen(true);
  };

  const handleCancelSubscription = async (subscription) => {
    if (confirm(`Are you sure you want to cancel the subscription for ${subscription.schoolName}?`)) {
      try {
        // Mock API call - replace with actual implementation
        console.log('Cancelling subscription:', subscription.id);
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('Failed to cancel subscription. Please try again.');
      }
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return variants[status] || variants.inactive;
  };

  const getPlanBadge = (plan) => {
    const variants = {
      basic: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      enterprise: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    return variants[plan] || variants.basic;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    navigate('/login');
    return null;
  }

  return (
    <DashboardLayout 
      icon={<CreditCard className="h-6 w-6" />}
      title="Subscription Management" 
      description="Manage subscriptions, billing, and payment methods"
      isAdmin={true}
      activeTab="subscriptions"
    >
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Subscription Management</h1>
              <p className="text-muted-foreground">Manage subscriptions, billing, and payment methods</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Subscription
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">K{totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Monthly recurring revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">Currently active plans</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trialSubscriptions}</div>
                <p className="text-xs text-muted-foreground">Schools on trial</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">Across all subscriptions</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="subscriptions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="billing">Billing History</TabsTrigger>
              <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
            </TabsList>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search subscriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscriptions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>Manage all school subscriptions and billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Next Billing</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedSubscriptions.map((subscription) => (
                        <TableRow key={subscription.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span>{subscription.schoolName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPlanBadge(subscription.planType)}>
                              {subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(subscription.status)}>
                              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{subscription.users}</TableCell>
                          <TableCell>K{subscription.revenue}</TableCell>
                          <TableCell>
                            {subscription.nextBillingDate ? 
                              new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 
                              'N/A'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewDetails(subscription)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSubscription(subscription);
                                  setIsUpgradeDialogOpen(true);
                                }}>
                                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                                  Upgrade Plan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleCancelSubscription(subscription)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Subscription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of {filteredSubscriptions.length} subscriptions
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing History Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View all billing transactions and invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{record.invoice}</TableCell>
                          <TableCell>K{record.amount}</TableCell>
                          <TableCell>
                            <Badge className={record.status === 'paid' ? getStatusBadge('active') : getStatusBadge('expired')}>
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className="relative">
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-3xl font-bold">K{plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Create Subscription Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Subscription</DialogTitle>
                <DialogDescription>
                  Set up a new subscription for a school.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="school-select" className="text-right">
                    School
                  </Label>
                  <Select value={createForm.schoolId} onValueChange={(value) => setCreateForm({...createForm, schoolId: value})}>
                    <SelectTrigger id="school-select" className="col-span-3">
                      <SelectValue placeholder="Select school" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Greenwood High School</SelectItem>
                      <SelectItem value="2">Riverside Elementary</SelectItem>
                      <SelectItem value="3">Mountain View Academy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="plan-select" className="text-right">
                    Plan
                  </Label>
                  <Select value={createForm.plan} onValueChange={(value) => setCreateForm({...createForm, plan: value})}>
                    <SelectTrigger id="plan-select" className="col-span-3">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic - K1,200/month</SelectItem>
                      <SelectItem value="premium">Premium - K2,500/month</SelectItem>
                      <SelectItem value="enterprise">Enterprise - K5,000/month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="users-input" className="text-right">
                    Users
                  </Label>
                  <Input
                    id="users-input"
                    type="number"
                    value={createForm.users}
                    onChange={(e) => setCreateForm({...createForm, users: Number.parseInt(e.target.value)})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start-date" className="text-right">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({...createForm, startDate: e.target.value})}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSubscription}>
                  Create Subscription
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upgrade Subscription Dialog */}
          <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Upgrade Subscription</DialogTitle>
                <DialogDescription>
                  Upgrade the subscription plan for {selectedSubscription?.schoolName}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="upgrade-plan" className="text-right">
                    New Plan
                  </Label>
                  <Select value={upgradeForm.plan} onValueChange={(value) => setUpgradeForm({...upgradeForm, plan: value})}>
                    <SelectTrigger id="upgrade-plan" className="col-span-3">
                      <SelectValue placeholder="Select new plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic - K1,200/month</SelectItem>
                      <SelectItem value="premium">Premium - K2,500/month</SelectItem>
                      <SelectItem value="enterprise">Enterprise - K5,000/month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="billing-cycle" className="text-right">
                    Billing Cycle
                  </Label>
                  <Select value={upgradeForm.billingCycle} onValueChange={(value) => setUpgradeForm({...upgradeForm, billingCycle: value})}>
                    <SelectTrigger id="billing-cycle" className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (10% discount)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleUpgradeSubscription}>
                  Upgrade Subscription
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Subscription Details</DialogTitle>
                <DialogDescription>
                  Detailed information for {selectedSubscription?.schoolName}
                </DialogDescription>
              </DialogHeader>
              {selectedSubscription && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">School Name</Label>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.schoolName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Plan Type</Label>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.planType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.status}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Users</Label>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.users}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Monthly Revenue</Label>
                      <p className="text-sm text-muted-foreground">K{selectedSubscription.revenue}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Next Billing</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedSubscription.nextBillingDate ? 
                          new Date(selectedSubscription.nextBillingDate).toLocaleDateString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionManagement;