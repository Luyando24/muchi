import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Smartphone,
  Building,
  Receipt,
  Send,
  Eye,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { Api } from '../../shared/api';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  class: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  createdDate: string;
  paidDate?: string;
  paymentMethod?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category: 'tuition' | 'books' | 'uniform' | 'transport' | 'meals' | 'activities' | 'other';
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'mobile_money' | 'card';
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  notes?: string;
}

interface FeeStructure {
  id: string;
  grade: string;
  term: string;
  tuitionFee: number;
  booksFee: number;
  uniformFee: number;
  transportFee: number;
  mealsFee: number;
  activitiesFee: number;
  totalFee: number;
}

interface FinanceStats {
  totalRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  collectionRate: number;
  monthlyRevenue: number[];
  paymentMethods: { method: string; amount: number; count: number }[];
}

export default function FinanceManagement() {
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isFeeStructureOpen, setIsFeeStructureOpen] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    studentId: '',
    dueDate: new Date(),
    items: [] as InvoiceItem[]
  });

  const [newPayment, setNewPayment] = useState({
    amount: 0,
    method: 'cash' as Payment['method'],
    reference: '',
    notes: ''
  });

  const [newFeeStructure, setNewFeeStructure] = useState({
    grade: '',
    term: '',
    tuitionFee: 0,
    booksFee: 0,
    uniformFee: 0,
    transportFee: 0,
    mealsFee: 0,
    activitiesFee: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [invoicesResponse, paymentsResponse, feeStructuresResponse, statsResponse] = await Promise.all([
        Api.listInvoices(),
        Api.listPayments(),
        Api.listFeeStructures(),
        Api.getFinanceStats()
      ]);
      
      setInvoices(invoicesResponse);
      setPayments(paymentsResponse);
      setFeeStructures(feeStructuresResponse);
      setStats(statsResponse);
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const totalAmount = newInvoice.items.reduce((sum, item) => sum + item.total, 0);
      
      await Api.createInvoice({
        ...newInvoice,
        amount: totalAmount
      });
      
      setIsCreateInvoiceOpen(false);
      setNewInvoice({
        studentId: '',
        dueDate: new Date(),
        items: []
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    
    try {
      await Api.recordPayment({
        invoiceId: selectedInvoice.id,
        ...newPayment
      });
      
      setIsPaymentDialogOpen(false);
      setNewPayment({
        amount: 0,
        method: 'cash',
        reference: '',
        notes: ''
      });
      setSelectedInvoice(null);
      
      await loadData();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const handleCreateFeeStructure = async () => {
    try {
      const totalFee = Object.values(newFeeStructure)
        .filter((value, index) => index > 1) // Skip grade and term
        .reduce((sum, fee) => sum + (typeof fee === 'number' ? fee : 0), 0);
      
      await Api.createFeeStructure({
        ...newFeeStructure,
        totalFee
      });
      
      setIsFeeStructureOpen(false);
      setNewFeeStructure({
        grade: '',
        term: '',
        tuitionFee: 0,
        booksFee: 0,
        uniformFee: 0,
        transportFee: 0,
        mealsFee: 0,
        activitiesFee: 0
      });
      
      await loadData();
    } catch (error) {
      console.error('Failed to create fee structure:', error);
    }
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      category: 'tuition'
    };
    
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });
  };

  type InvoiceItemValue = string | number;

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: InvoiceItemValue) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const removeInvoiceItem = (index: number) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter((_, i) => i !== index)
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout
        title="Finance Management"
        subtitle="Manage school fees, invoices, and payments"
        icon={<DollarSign className="h-8 w-8 text-primary" />}
        activeTab="finance"
      >
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Finance Management"
      subtitle="Manage school fees, invoices, and payments"
      icon={<DollarSign className="h-8 w-8 text-primary" />}
      activeTab="finance"
    >
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Dialog open={isFeeStructureOpen} onOpenChange={setIsFeeStructureOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building className="h-4 w-4 mr-2" />
                Fee Structure
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">K{stats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">K{stats.pendingPayments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter(i => i.status === 'pending').length} invoices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  K{stats.overduePayments.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter(i => i.status === 'overdue').length} invoices
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.collectionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  This academic year
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="fee-structures" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Fee Structures
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="invoices" className="space-y-6">
            {/* Enhanced Filters */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by student name or invoice number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px] h-11">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-11">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Invoices Table */}
            <Card className="shadow-sm">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoices Management
                </CardTitle>
                <CardDescription>Manage student fee invoices and track payments</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Invoice #</TableHead>
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">Class</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Due Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium text-primary">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-medium">{invoice.studentName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              {invoice.class}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">K{invoice.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(invoice.status)}
                              <Badge className={getStatusColor(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setIsPaymentDialogOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Track all payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invoices.find(i => i.id === payment.invoiceId)?.invoiceNumber}
                        </TableCell>
                        <TableCell>K{payment.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {payment.method === 'mobile_money' && <Smartphone className="h-4 w-4" />}
                            {payment.method === 'bank_transfer' && <Building className="h-4 w-4" />}
                            {payment.method === 'card' && <CreditCard className="h-4 w-4" />}
                            <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>{payment.reference}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="fee-structures" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Fee Structures</CardTitle>
                <CardDescription>Manage fee structures by grade and term</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Tuition</TableHead>
                      <TableHead>Books</TableHead>
                      <TableHead>Uniform</TableHead>
                      <TableHead>Transport</TableHead>
                      <TableHead>Meals</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell>{structure.grade}</TableCell>
                        <TableCell>{structure.term}</TableCell>
                        <TableCell>K{structure.tuitionFee.toFixed(2)}</TableCell>
                        <TableCell>K{structure.booksFee.toFixed(2)}</TableCell>
                        <TableCell>K{structure.uniformFee.toFixed(2)}</TableCell>
                        <TableCell>K{structure.transportFee.toFixed(2)}</TableCell>
                        <TableCell>K{structure.mealsFee.toFixed(2)}</TableCell>
                        <TableCell>K{structure.activitiesFee.toFixed(2)}</TableCell>
                        <TableCell className="font-bold">
                          K{structure.totalFee.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Reports</CardTitle>
                  <CardDescription>Financial performance analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Monthly Revenue Report
                    </Button>
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Outstanding Fees Report
                    </Button>
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Payment Methods Analysis
                    </Button>
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Fee Collection Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Export Options</CardTitle>
                  <CardDescription>Download financial data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export All Invoices (CSV)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Payment History (PDF)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Fee Structures (Excel)
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Financial Summary (PDF)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Invoice Dialog */}
        <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new fee invoice for a student
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select 
                    value={newInvoice.studentId} 
                    onValueChange={(value) => setNewInvoice({ ...newInvoice, studentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student1">John Doe - Grade 10A</SelectItem>
                      <SelectItem value="student2">Jane Smith - Grade 9B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newInvoice.dueDate.toISOString().split('T')[0]}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: new Date(e.target.value) })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Invoice Items</Label>
                  <Button onClick={addInvoiceItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {newInvoice.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Category</Label>
                      <Select 
                        value={item.category} 
                        onValueChange={(value) => updateInvoiceItem(index, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tuition">Tuition</SelectItem>
                          <SelectItem value="books">Books</SelectItem>
                          <SelectItem value="uniform">Uniform</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="meals">Meals</SelectItem>
                          <SelectItem value="activities">Activities</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        value={`K${item.total.toFixed(2)}`}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="col-span-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeInvoiceItem(index)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {newInvoice.items.length > 0 && (
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        Total: K{newInvoice.items.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice}>
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Record Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for invoice {selectedInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Payment amount"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select 
                  value={newPayment.method} 
                  onValueChange={(value: Payment['method']) => setNewPayment({ ...newPayment, method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment}>
                Record Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Fee Structure Dialog */}
        <Dialog open={isFeeStructureOpen} onOpenChange={setIsFeeStructureOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fee Structure</DialogTitle>
              <DialogDescription>
                Set up fee structure for a grade and term
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select 
                    value={newFeeStructure.grade} 
                    onValueChange={(value) => setNewFeeStructure({ ...newFeeStructure, grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Grade 8">Grade 8</SelectItem>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                      <SelectItem value="Grade 10">Grade 10</SelectItem>
                      <SelectItem value="Grade 11">Grade 11</SelectItem>
                      <SelectItem value="Grade 12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Term</Label>
                  <Select 
                    value={newFeeStructure.term} 
                    onValueChange={(value) => setNewFeeStructure({ ...newFeeStructure, term: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tuition Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.tuitionFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, tuitionFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Books Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.booksFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, booksFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Uniform Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.uniformFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, uniformFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Transport Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.transportFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, transportFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Meals Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.mealsFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, mealsFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Activities Fee</Label>
                  <Input
                    type="number"
                    value={newFeeStructure.activitiesFee}
                    onChange={(e) => setNewFeeStructure({ ...newFeeStructure, activitiesFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    Total Fee: K{(
                      newFeeStructure.tuitionFee +
                      newFeeStructure.booksFee +
                      newFeeStructure.uniformFee +
                      newFeeStructure.transportFee +
                      newFeeStructure.mealsFee +
                      newFeeStructure.activitiesFee
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsFeeStructureOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFeeStructure}>
                Create Fee Structure
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}