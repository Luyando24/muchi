import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Download,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { FinanceRecord, FinanceStats } from '@shared/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function FinanceManagement() {
  const [transactions, setTransactions] = useState<FinanceRecord[]>([]);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<FinanceRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    description: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`
      };

      // Fetch transactions
      const trxResponse = await fetch('/api/school/finance', { headers });
      if (!trxResponse.ok) throw new Error('Failed to fetch transactions');
      const trxData = await trxResponse.json();
      setTransactions(trxData);

      // Fetch stats
      const statsResponse = await fetch('/api/school/finance/stats', { headers });
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

    } catch (error: any) {
      console.error('Error fetching finance data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data. Ensure database tables are created.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      description: '',
      type: 'income',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setCurrentTransaction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = currentTransaction
        ? `/api/school/finance/${currentTransaction.id}`
        : '/api/school/finance';

      const method = currentTransaction ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save transaction');
      }

      toast({
        title: "Success",
        description: `Transaction ${currentTransaction ? 'updated' : 'recorded'} successfully`,
      });

      setIsAddOpen(false);
      setIsEditOpen(false);
      resetForm();
      fetchFinanceData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (record: FinanceRecord) => {
    setCurrentTransaction(record);
    setFormData({
      description: record.description,
      type: record.type,
      category: record.category,
      amount: record.amount.toString(),
      date: record.date
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/finance/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      toast({ title: "Success", description: "Transaction deleted successfully" });
      setDeleteTargetId(null);
      fetchFinanceData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Overview</h2>
          <p className="text-slate-600 dark:text-slate-400">Track income, expenses, and fee collection.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Record Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Transaction</DialogTitle>
                <DialogDescription>
                  Enter the details of the financial transaction.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      name="type"
                      value={formData.type}
                      onValueChange={(val) => handleSelectChange('type', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    name="category"
                    value={formData.category}
                    onValueChange={(val) => handleSelectChange('category', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tuition Fees">Tuition Fees</SelectItem>
                      <SelectItem value="Uniforms">Uniforms</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Donations">Donations</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (ZK)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Transaction details..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Transaction</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Type</Label>
                    <Select
                      name="type"
                      value={formData.type}
                      onValueChange={(val) => handleSelectChange('type', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    name="category"
                    value={formData.category}
                    onValueChange={(val) => handleSelectChange('category', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tuition Fees">Tuition Fees</SelectItem>
                      <SelectItem value="Uniforms">Uniforms</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Donations">Donations</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Supplies">Supplies</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount (ZK)</Label>
                  <Input
                    id="edit-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Transaction</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                ZK {stats?.totalRevenue.toLocaleString() || '0'}
              </h3>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats?.monthlyRevenue ? `+ZK ${stats.monthlyRevenue.toLocaleString()} this month` : 'No data'}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Expenses</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                ZK {stats?.totalExpenses.toLocaleString() || '0'}
              </h3>
              <p className="text-xs text-red-500 flex items-center mt-1">
                <TrendingDown className="h-3 w-3 mr-1" />
                {stats?.monthlyExpenses ? `+ZK ${stats.monthlyExpenses.toLocaleString()} this month` : 'No data'}
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Net Income</p>
              <h3 className={`text-2xl font-bold ${((stats?.netIncome || 0) >= 0) ? 'text-slate-900 dark:text-white' : 'text-red-600'}`}>
                ZK {stats?.netIncome.toLocaleString() || '0'}
              </h3>
              <p className="text-xs text-slate-500 flex items-center mt-1">
                Lifetime net income
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                      <p className="mt-2 text-sm text-slate-500">Loading transactions...</p>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No transactions found. Click "Record Transaction" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((trx) => (
                    <TableRow key={trx.id}>
                      <TableCell className="font-medium">{trx.description}</TableCell>
                      <TableCell>{trx.category}</TableCell>
                      <TableCell>
                        <Badge variant={trx.type === 'income' ? 'outline' : 'secondary'}
                          className={trx.type === 'income' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}>
                          {trx.type.charAt(0).toUpperCase() + trx.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{trx.date}</TableCell>
                      <TableCell className={`text-right font-medium ${trx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {trx.type === 'income' ? '+' : '-'}ZK {Number(trx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(trx)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(trx.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Transaction?"
        description="Are you sure you want to delete this financial transaction? This action cannot be undone."
        confirmLabel="Delete Transaction"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
