import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Progress } from '../components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import AdminSidebar from '@/components/dashboard/AdminSidebar';
import { 
  useSubscriptions, 
  usePlans, 
  usePaymentMethods, 
  useBillingHistory,
  type Subscription,
  type Plan,
  type PaymentMethod,
  type BillingRecord
} from '../hooks/useSubscriptions';
import { useSchools } from '../hooks/useSchools';
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
  ArrowDownCircle,
  ArrowUp,
  ArrowDown,
  Menu,
  User,
  LogOut,
  Activity,
  Check,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const SubscriptionManagement = () => {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  
  // Use custom hooks for data fetching
  const { 
    subscriptions, 
    loading: subscriptionsLoading, 
    error: subscriptionsError,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    refetch: refetchSubscriptions
  } = useSubscriptions();
  
  const { 
    plans, 
    loading: plansLoading, 
    error: plansError 
  } = usePlans();
  
  const { 
    paymentMethods, 
    loading: paymentMethodsLoading, 
    error: paymentMethodsError,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    refetch: refetchPaymentMethods
  } = usePaymentMethods();
  
  const { 
    billingHistory, 
    loading: billingHistoryLoading, 
    error: billingHistoryError 
  } = useBillingHistory();
  
  // Fetch available schools
  const { 
    activeSchools, 
    loading: schoolsLoading, 
    error: schoolsError 
  } = useSchools();
  
  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Calculated values
  const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.revenue, 0);
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const trialSubscriptions = subscriptions.filter(sub => sub.status === 'trial').length;
  const totalUsers = subscriptions.reduce((sum, sub) => sum + sub.users, 0);

  // Combined loading state
  const isLoading = subscriptionsLoading || plansLoading || paymentMethodsLoading || billingHistoryLoading;

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
  }
  

  const handleCreateSubscription = async () => {
    if (!createForm.schoolId || !createForm.plan) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await createSubscription({
        schoolId: createForm.schoolId,
        planId: createForm.plan,
        billingCycle: createForm.billingCycle,
        usersCount: createForm.users,
        startDate: createForm.startDate
      });

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
      await updateSubscription(selectedSubscription.id, {
        planId: upgradeForm.plan,
        billingCycle: upgradeForm.billingCycle
      });

      setIsUpgradeDialogOpen(false);
      setUpgradeForm({ plan: '', billingCycle: 'monthly' });
      setSelectedSubscription(null);
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      alert('Failed to upgrade subscription. Please try again.');
    }
  };

  const handleViewDetails = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsViewDialogOpen(true);
  };

  const handleExtendSubscription = async (subscription: Subscription) => {
    try {
      const extendedDate = new Date(subscription.endDate);
      extendedDate.setFullYear(extendedDate.getFullYear() + 1);

      await updateSubscription(subscription.id, {
        endDate: extendedDate.toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to extend subscription:', error);
      alert('Failed to extend subscription. Please try again.');
    }
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    if (confirm(`Are you sure you want to cancel the subscription for ${subscription.schoolName}?`)) {
      try {
        await cancelSubscription(subscription.id);
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('Failed to cancel subscription. Please try again.');
      }
    }
  };

  const handleAddPaymentMethod = () => {
    // Open payment method dialog
    console.log('Add payment method');
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      await setDefaultPaymentMethod(methodId);
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      alert('Failed to set default payment method. Please try again.');
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      try {
        await deletePaymentMethod(methodId);
      } catch (error) {
        console.error('Failed to delete payment method:', error);
        alert('Failed to delete payment method. Please try again.');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return variants[status as keyof typeof variants] || variants.inactive;
  };

  const getPlanBadge = (plan: string) => {
    const variants = {
      basic: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      premium: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      enterprise: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    };
    return variants[plan as keyof typeof variants] || variants.basic;
  };

  if (authLoading || isLoading) {
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
    <div className="flex h-screen bg-background">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Subscription Management</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage subscriptions, billing, and payment methods</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session?.user?.name || 'Admin User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session?.user?.email || 'admin@muchi.com'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
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
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="billing">Billing History</TabsTrigger>
                <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
                <TabsTrigger value="payments">Payment Methods</TabsTrigger>
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
                                  <DropdownMenuItem onClick={() => handleExtendSubscription(subscription)}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Extend Subscription
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
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
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
                          <TableHead>Invoice</TableHead>
                          <TableHead>School</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingHistory.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.invoiceNumber}</TableCell>
                            <TableCell>{record.schoolName}</TableCell>
                            <TableCell>{record.planType}</TableCell>
                            <TableCell>K{record.amount}</TableCell>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(record.status)}>
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

              {/* Plans & Pricing Tab */}
              <TabsContent value="plans" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Subscription Plans</h3>
                    <p className="text-sm text-muted-foreground">Manage available subscription plans and pricing</p>
                  </div>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plan
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={plan.popular ? "border-primary" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{plan.name}</CardTitle>
                          {plan.popular && (
                            <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-3xl font-bold">K{plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                          <div className="text-sm text-muted-foreground">K{plan.yearlyPrice}/year (save 17%)</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-sm text-muted-foreground">Up to {plan.maxUsers} users</div>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <Check className="mr-2 h-4 w-4" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button className="w-full">Select Plan</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Payment Methods Tab */}
              <TabsContent value="payments" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Payment Methods</h3>
                    <p className="text-sm text-muted-foreground">Manage payment methods for all schools</p>
                  </div>
                  <Button onClick={handleAddPaymentMethod}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment Method
                  </Button>
                </div>

                <div className="grid gap-4">
                  {paymentMethods.map((method) => (
                    <Card key={method.id}>
                      <CardContent className="flex items-center justify-between p-6">
                        <div className="flex items-center space-x-4">
                          <CreditCard className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{method.brand} •••• {method.last4}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.schoolName} • Expires {method.expiryMonth}/{method.expiryYear}
                            </div>
                          </div>
                          {method.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!method.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePaymentMethod(method.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Create Subscription Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Subscription</DialogTitle>
              <DialogDescription>
                Set up a new subscription for a school
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolSelect">School Name</Label>
                <Select 
                  value={createForm.schoolId} 
                  onValueChange={(value) => setCreateForm({ ...createForm, schoolId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={schoolsLoading ? "Loading schools..." : "Select a school"} />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolsLoading ? (
                      <SelectItem value="" disabled>Loading schools...</SelectItem>
                    ) : schoolsError ? (
                      <SelectItem value="" disabled>Error loading schools</SelectItem>
                    ) : activeSchools.length === 0 ? (
                      <SelectItem value="" disabled>No active schools available</SelectItem>
                    ) : (
                      activeSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan">Subscription Plan</Label>
                  <Select value={createForm.plan} onValueChange={(value) => 
                    setCreateForm({ ...createForm, plan: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - K{plan.price}/month
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select value={createForm.billingCycle} onValueChange={(value) => 
                    setCreateForm({ ...createForm, billingCycle: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly (17% off)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="users">Number of Users</Label>
                  <Input
                    id="users"
                    type="number"
                    min="1"
                    value={createForm.users}
                    onChange={(e) => setCreateForm({ ...createForm, users: parseInt(e.target.value) || 1 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={createForm.paymentMethod} onValueChange={(value) => 
                  setCreateForm({ ...createForm, paymentMethod: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.brand} •••• {method.last4}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {createForm.plan && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost:</span>
                    <span className="text-lg font-bold">
                      K{plans.find(p => p.id === createForm.plan)?.[createForm.billingCycle === 'yearly' ? 'yearlyPrice' : 'price']}/{createForm.billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSubscription}>
                  Create Subscription
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Upgrade Subscription Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upgrade Subscription</DialogTitle>
              <DialogDescription>
                Upgrade the subscription plan for {selectedSubscription?.schoolName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upgradePlan">New Plan</Label>
                <Select value={upgradeForm.plan} onValueChange={(value) => 
                  setUpgradeForm({ ...upgradeForm, plan: value })
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - K{plan.price}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="upgradeBillingCycle">Billing Cycle</Label>
                <Select value={upgradeForm.billingCycle} onValueChange={(value) => 
                  setUpgradeForm({ ...upgradeForm, billingCycle: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly (17% off)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {upgradeForm.plan && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">New Cost:</span>
                    <span className="text-lg font-bold">
                      K{plans.find(p => p.id === upgradeForm.plan)?.[upgradeForm.billingCycle === 'yearly' ? 'yearlyPrice' : 'price']}/{upgradeForm.billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpgradeSubscription}>
                  Upgrade Subscription
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Subscription Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Subscription Details</DialogTitle>
            </DialogHeader>
            {selectedSubscription && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">School Name</label>
                    <p className="text-sm font-semibold">{selectedSubscription.schoolName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Plan</label>
                    <p className="text-sm font-semibold">{selectedSubscription.planName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className={`text-sm font-semibold ${
                      selectedSubscription.status === 'active' ? 'text-green-600' :
                      selectedSubscription.status === 'trial' ? 'text-blue-600' :
                      selectedSubscription.status === 'expired' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {selectedSubscription.status.charAt(0).toUpperCase() + selectedSubscription.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Billing Cycle</label>
                    <p className="text-sm font-semibold">{selectedSubscription.billingCycle}</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-sm">{new Date(selectedSubscription.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Date</label>
                    <p className="text-sm">{new Date(selectedSubscription.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Next Billing Date</label>
                    <p className="text-sm">
                      {selectedSubscription.nextBillingDate 
                        ? new Date(selectedSubscription.nextBillingDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Trial End Date</label>
                    <p className="text-sm">
                      {selectedSubscription.trialEndDate 
                        ? new Date(selectedSubscription.trialEndDate).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-sm font-semibold">${selectedSubscription.amount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Currency</label>
                    <p className="text-sm">{selectedSubscription.currency}</p>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created At</label>
                    <p className="text-sm">{new Date(selectedSubscription.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Updated At</label>
                    <p className="text-sm">{new Date(selectedSubscription.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default SubscriptionManagement;