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
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Send, 
  Calendar, 
  DollarSign, 
  FileText, 
  CreditCard,
  Building,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Mail,
  Printer
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'mobile_money' | 'cash';
  description: string;
  items: InvoiceItem[];
  notes?: string;
  paymentReference?: string;
  remindersSent: number;
  lastReminderDate?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  period: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'card' | 'bank_transfer' | 'mobile_money' | 'cash';
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
  notes?: string;
  transactionId?: string;
}

interface BillingStats {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  averagePaymentTime: number;
  collectionRate: number;
}

const BillingHistory: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      
      // Mock data - replace with actual API calls
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          subscriptionId: 'sub-1',
          schoolId: 'school-1',
          schoolName: 'Lusaka Primary School',
          amount: 299,
          tax: 44.85,
          total: 343.85,
          status: 'paid',
          issueDate: '2024-01-15',
          dueDate: '2024-01-30',
          paidDate: '2024-01-16',
          paymentMethod: 'card',
          description: 'Premium Plan - January 2024',
          items: [
            {
              id: '1',
              description: 'Premium Plan Subscription',
              quantity: 1,
              unitPrice: 299,
              total: 299,
              period: 'January 2024'
            }
          ],
          remindersSent: 0,
          paymentReference: 'pay_1234567890'
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          subscriptionId: 'sub-2',
          schoolId: 'school-2',
          schoolName: 'Ndola Secondary School',
          amount: 199,
          tax: 29.85,
          total: 228.85,
          status: 'paid',
          issueDate: '2024-02-01',
          dueDate: '2024-02-15',
          paidDate: '2024-02-02',
          paymentMethod: 'bank_transfer',
          description: 'Standard Plan - February 2024',
          items: [
            {
              id: '2',
              description: 'Standard Plan Subscription',
              quantity: 1,
              unitPrice: 199,
              total: 199,
              period: 'February 2024'
            }
          ],
          remindersSent: 0,
          paymentReference: 'TXN-987654321'
        },
        {
          id: '3',
          invoiceNumber: 'INV-2024-003',
          subscriptionId: 'sub-3',
          schoolId: 'school-3',
          schoolName: 'Kitwe Combined School',
          amount: 99,
          tax: 14.85,
          total: 113.85,
          status: 'overdue',
          issueDate: '2024-02-20',
          dueDate: '2024-03-05',
          description: 'Basic Plan - Trial to Paid Conversion',
          items: [
            {
              id: '3',
              description: 'Basic Plan Subscription',
              quantity: 1,
              unitPrice: 99,
              total: 99,
              period: 'March 2024'
            }
          ],
          remindersSent: 2,
          lastReminderDate: '2024-03-10'
        },
        {
          id: '4',
          invoiceNumber: 'INV-2024-004',
          subscriptionId: 'sub-4',
          schoolId: 'school-4',
          schoolName: 'Livingstone High School',
          amount: 199,
          tax: 29.85,
          total: 228.85,
          status: 'sent',
          issueDate: '2024-03-01',
          dueDate: '2024-03-15',
          description: 'Standard Plan - March 2024',
          items: [
            {
              id: '4',
              description: 'Standard Plan Subscription',
              quantity: 1,
              unitPrice: 199,
              total: 199,
              period: 'March 2024'
            }
          ],
          remindersSent: 0
        }
      ];

      const mockPayments: Payment[] = [
        {
          id: '1',
          invoiceId: '1',
          amount: 343.85,
          method: 'card',
          reference: 'pay_1234567890',
          status: 'completed',
          date: '2024-01-16',
          transactionId: 'txn_abc123'
        },
        {
          id: '2',
          invoiceId: '2',
          amount: 228.85,
          method: 'bank_transfer',
          reference: 'TXN-987654321',
          status: 'completed',
          date: '2024-02-02',
          transactionId: 'txn_def456'
        }
      ];

      const mockStats: BillingStats = {
        totalRevenue: 1071.4,
        pendingAmount: 228.85,
        overdueAmount: 113.85,
        paidInvoices: 2,
        pendingInvoices: 1,
        overdueInvoices: 1,
        averagePaymentTime: 1.5,
        collectionRate: 85.2
      };

      setInvoices(mockInvoices);
      setPayments(mockPayments);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const invoiceDate = new Date(invoice.issueDate);
      const now = new Date();
      
      switch (dateFilter) {
        case 'this_month':
          return invoiceDate.getMonth() === now.getMonth() && 
                 invoiceDate.getFullYear() === now.getFullYear();
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return invoiceDate.getMonth() === lastMonth.getMonth() && 
                 invoiceDate.getFullYear() === lastMonth.getFullYear();
        case 'this_year':
          return invoiceDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      refunded: { color: 'bg-orange-100 text-orange-800', icon: RefreshCw }
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <Building className="h-4 w-4" />;
      case 'mobile_money':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceDialogOpen(true);
  };

  const handleSendReminder = async (invoiceId: string) => {
    // Implementation for sending payment reminder
    console.log('Sending reminder for invoice:', invoiceId);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    // Implementation for manually marking invoice as paid
    console.log('Marking invoice as paid:', invoiceId);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Implementation for downloading invoice PDF
    console.log('Downloading invoice:', invoice.invoiceNumber);
  };

  const handleRecordPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
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
              <p className="text-xs text-muted-foreground">All time revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">K{stats.pendingAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.pendingInvoices} pending invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">K{stats.overdueAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.overdueInvoices} overdue invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.collectionRate}%</div>
              <p className="text-xs text-muted-foreground">Payment success rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
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
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>All invoices and payment records</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">{invoice.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.schoolName}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">K{invoice.total.toFixed(2)}</div>
                      {invoice.paymentMethod && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          {getPaymentMethodIcon(invoice.paymentMethod)}
                          <span className="ml-1 capitalize">
                            {invoice.paymentMethod.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div>
                      <div>{new Date(invoice.dueDate).toLocaleDateString()}</div>
                      {invoice.status === 'overdue' && (
                        <div className="text-xs text-red-500">
                          {Math.ceil((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleSendReminder(invoice.id)}>
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRecordPayment(invoice)}>
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber} - {selectedInvoice?.schoolName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <div className="text-sm">
                    <div className="font-medium">{selectedInvoice.schoolName}</div>
                    <div className="text-muted-foreground">School ID: {selectedInvoice.schoolId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm space-y-1">
                    <div><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</div>
                    <div><strong>Issue Date:</strong> {new Date(selectedInvoice.issueDate).toLocaleDateString()}</div>
                    <div><strong>Due Date:</strong> {new Date(selectedInvoice.dueDate).toLocaleDateString()}</div>
                    <div><strong>Status:</strong> {getStatusBadge(selectedInvoice.status)}</div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-2">Items:</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.period}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>K{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>K{item.total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Invoice Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>K{selectedInvoice.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (15%):</span>
                      <span>K{selectedInvoice.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>K{selectedInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              {selectedInvoice.status === 'paid' && selectedInvoice.paidDate && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Payment Information</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <div><strong>Paid Date:</strong> {new Date(selectedInvoice.paidDate).toLocaleDateString()}</div>
                    <div><strong>Payment Method:</strong> {selectedInvoice.paymentMethod?.replace('_', ' ')}</div>
                    {selectedInvoice.paymentReference && (
                      <div><strong>Reference:</strong> {selectedInvoice.paymentReference}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && (
                  <Button variant="outline" onClick={() => handleSendReminder(selectedInvoice.id)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminder
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                defaultValue={selectedInvoice?.total}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Reference</Label>
              <Input placeholder="Transaction reference or receipt number" />
            </div>

            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Additional notes about this payment..." />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1">
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingHistory;