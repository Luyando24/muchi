import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Store,
  Plus,
  Search,
  Trash2,
  Edit,
  ShoppingCart,
  Coins,
  Users,
  Layers,
  TrendingUp,
  Package,
  AlertTriangle,
  UserCheck,
  Check,
  X,
  CreditCard,
  UserPlus,
  Loader2,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const ResponsiveContainerAny = ResponsiveContainer as any;
const AreaChartAny = AreaChart as any;
const AreaAny = Area as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const TooltipAny = Tooltip as any;
const CartesianGridAny = CartesianGrid as any;
const BarChartAny = BarChart as any;
const BarAny = Bar as any;
const CellAny = Cell as any;


interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  category: string;
}

interface SaleItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface StaffAssignment {
  id: string;
  user_id: string;
  role: 'Manager' | 'Seller' | 'Assistant';
  status: 'Active' | 'Inactive';
  profile: {
    full_name: string;
    role: string;
    email: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email: string;
}

export default function TuckshopManagement() {
  const { toast } = useToast();
  
  // Dashboard & State
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    description: '',
    cost_price: '',
    selling_price: '',
    stock_quantity: '',
    reorder_level: '5',
    category: 'General'
  });

  // Sales State
  const [sales, setSales] = useState<any[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [buyerType, setBuyerType] = useState<'student' | 'staff' | 'civilian' | 'other'>('civilian');
  const [buyerId, setBuyerId] = useState<string>('');
  const [buyerName, setBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Mobile Money' | 'School Wallet' | 'Other'>('Cash');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileSearch, setProfileSearch] = useState('');
  
  // Staff State
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    user_id: '',
    role: 'Seller' as 'Manager' | 'Seller' | 'Assistant',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Analytics State
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalSalesCount: 0,
    grossProfit: 0,
    lowStockCount: 0,
    topProducts: [] as any[],
    salesTimeline: [] as any[]
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .single();
      
      if (profile?.school_id) {
        setSchoolId(profile.school_id);
        await Promise.all([
          fetchProducts(profile.school_id),
          fetchSales(profile.school_id),
          fetchStaff(profile.school_id),
          fetchAnalytics(profile.school_id),
          fetchSchoolProfiles(profile.school_id)
        ]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async (sid: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/school/tuckshop/inventory', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setProducts(data || []);
    }
  };

  const fetchSales = async (sid: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/school/tuckshop/sales', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setSales(data || []);
    }
  };

  const fetchStaff = async (sid: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/school/tuckshop/staff', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setStaff(data || []);
    }
  };

  const fetchAnalytics = async (sid: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/school/tuckshop/analytics', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  };

  const fetchSchoolProfiles = async (sid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('school_id', sid)
      .order('full_name', { ascending: true });
    
    if (!error && data) {
      setProfiles(data);
    }
  };

  // ----------------------------------------------------
  // INVENTORY OPERATIONS
  // ----------------------------------------------------
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: '',
      description: '',
      cost_price: '',
      selling_price: '',
      stock_quantity: '',
      reorder_level: '5',
      category: 'General'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      sku: prod.sku || '',
      description: prod.description || '',
      cost_price: prod.cost_price.toString(),
      selling_price: prod.selling_price.toString(),
      stock_quantity: prod.stock_quantity.toString(),
      reorder_level: prod.reorder_level.toString(),
      category: prod.category || 'General'
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.cost_price || !productForm.selling_price) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = editingProduct 
        ? `/api/school/tuckshop/inventory/${editingProduct.id}`
        : '/api/school/tuckshop/inventory';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(productForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save product');
      }

      toast({
        title: 'Product Saved',
        description: `${productForm.name} saved successfully.`
      });

      setIsProductModalOpen(false);
      if (schoolId) {
        await fetchProducts(schoolId);
        await fetchAnalytics(schoolId);
      }
    } catch (err: any) {
      toast({
        title: 'Error Saving Product',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/tuckshop/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete product');
      }

      toast({
        title: 'Product Deleted',
        description: `${name} has been removed from inventory.`
      });

      if (schoolId) {
        await fetchProducts(schoolId);
        await fetchAnalytics(schoolId);
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  // ----------------------------------------------------
  // POS REGISTER OPERATIONS
  // ----------------------------------------------------
  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock.`,
        variant: 'destructive'
      });
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock_quantity) {
        toast({
          title: 'Stock Limit Reached',
          description: `Cannot add more than ${product.stock_quantity} units of ${product.name}.`,
          variant: 'destructive'
        });
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.selling_price
      }]);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const existing = cart.find(item => item.product_id === productId);
    const product = products.find(p => p.id === productId);
    if (!existing || !product) return;

    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      if (newQty > product.stock_quantity) {
        toast({
          title: 'Stock Limit Reached',
          description: `Cannot add more than ${product.stock_quantity} units.`,
          variant: 'destructive'
        });
        return;
      }
      setCart(cart.map(item => item.product_id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items before checkout.',
        variant: 'destructive'
      });
      return;
    }

    if ((buyerType === 'student' || buyerType === 'staff') && !buyerId) {
      toast({
        title: 'Buyer Profile Required',
        description: 'Please select a student or staff member profile.',
        variant: 'destructive'
      });
      return;
    }

    if ((buyerType === 'civilian' || buyerType === 'other') && !buyerName.trim()) {
      toast({
        title: 'Buyer Name Required',
        description: 'Please type the name of the civilian/other buyer.',
        variant: 'destructive'
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/school/tuckshop/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          buyer_type: buyerType,
          buyer_id: buyerId || null,
          buyer_name: buyerName || null,
          payment_method: paymentMethod,
          items: cart
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Checkout failed');
      }

      toast({
        title: 'Checkout Successful',
        description: 'Transaction recorded and stock updated.'
      });

      // Reset Cart and Buyer states
      setCart([]);
      setBuyerId('');
      setBuyerName('');
      
      if (schoolId) {
        await fetchProducts(schoolId);
        await fetchSales(schoolId);
        await fetchAnalytics(schoolId);
      }
    } catch (err: any) {
      toast({
        title: 'Checkout Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // STAFF ASSIGNMENTS OPERATIONS
  // ----------------------------------------------------
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.user_id) {
      toast({
        title: 'Profile Required',
        description: 'Please select a profile to assign.',
        variant: 'destructive'
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/school/tuckshop/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(staffForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to assign staff');
      }

      toast({
        title: 'Staff Assigned',
        description: 'Operator assigned successfully.'
      });

      setIsStaffModalOpen(false);
      setStaffForm({ user_id: '', role: 'Seller', status: 'Active' });
      if (schoolId) await fetchStaff(schoolId);
    } catch (err: any) {
      toast({
        title: 'Assignment Failed',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateStaffStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/tuckshop/staff/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update status');
      }

      toast({
        title: 'Status Updated',
        description: `Staff operator is now ${nextStatus}.`
      });

      if (schoolId) await fetchStaff(schoolId);
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff assignment?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/school/tuckshop/staff/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete assignment');
      }

      toast({
        title: 'Staff Removed',
        description: 'Operator assignment deleted successfully.'
      });

      if (schoolId) await fetchStaff(schoolId);
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  // Filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = ['All', ...Array.from(new Set(products.map(p => p.category || 'General')))];

  const totalCartCost = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  // Search profiles for assignment or buyer
  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(profileSearch.toLowerCase()) ||
    (p.email && p.email.toLowerCase().includes(profileSearch.toLowerCase()))
  );

  const selectedProfileDetails = profiles.find(p => p.id === buyerId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading tuckshop details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tuckshop Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Track student store inventory, sales, cashier assignments and metrics.</p>
          </div>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pos">POS Register</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="staff">Staff & Cashiers</TabsTrigger>
          <TabsTrigger value="sales-log">Sales Log</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- */}
        {/* OVERVIEW TAB */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {analytics.lowStockCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
              <div className="text-xs">
                <span className="font-bold">Inventory Low-Stock Warning! </span>
                There are currently {analytics.lowStockCount} items at or below their reorder levels. Check the Inventory tab to restock.
              </div>
            </div>
          )}

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-slate-100 dark:border-slate-800/80 shadow-sm hover:scale-[1.01] transition-transform duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</CardTitle>
                <Coins className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">ZMW {analytics.totalRevenue.toFixed(2)}</div>
                <p className="text-[10px] text-slate-500 mt-1">Sum of all completed store purchases.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-100 dark:border-slate-800/80 shadow-sm hover:scale-[1.01] transition-transform duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Store Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics.totalSalesCount}</div>
                <p className="text-[10px] text-slate-500 mt-1">Number of transactions logged in POS.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-100 dark:border-slate-800/80 shadow-sm hover:scale-[1.01] transition-transform duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Profit Margin</CardTitle>
                <TrendingUp className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">ZMW {analytics.grossProfit.toFixed(2)}</div>
                <p className="text-[10px] text-slate-500 mt-1">Estimated difference: Selling vs Cost Price.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-100 dark:border-slate-800/80 shadow-sm hover:scale-[1.01] transition-transform duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Restock Indicators</CardTitle>
                <Package className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900 dark:text-white">{analytics.lowStockCount}</div>
                <p className="text-[10px] text-slate-500 mt-1">Products running low in stock.</p>
              </CardContent>
            </Card>
          </div>

          {/* CHARTS CONTAINER */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Chart */}
            <Card className="lg:col-span-2 border-slate-100 dark:border-slate-800/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Daily Revenue Timeline</CardTitle>
                <CardDescription className="text-xs">Tuckshop cashflow trends over the last 7 days.</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {analytics.salesTimeline.length > 0 ? (
                  <ResponsiveContainerAny width="100%" height="100%">
                    <AreaChartAny data={analytics.salesTimeline}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxisAny dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxisAny stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <TooltipAny contentStyle={{ fontSize: '11px', borderRadius: '8px' }} formatter={(v) => [`ZMW ${v}`, 'Revenue']} />
                      <AreaAny type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChartAny>
                  </ResponsiveContainerAny>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">No sales logs recorded this week.</div>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="border-slate-100 dark:border-slate-800/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Top Selling Products</CardTitle>
                <CardDescription className="text-xs">Fastest moving items by units sold.</CardDescription>
              </CardHeader>
              <CardContent className="h-72 flex flex-col justify-between">
                {analytics.topProducts.length > 0 ? (
                  <ResponsiveContainerAny width="100%" height="80%">
                    <BarChartAny data={analytics.topProducts} layout="vertical">
                      <CartesianGridAny strokeDasharray="3 3" horizontal={false} vertical={false} />
                      <XAxisAny type="number" hide />
                      <YAxisAny dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                      <TooltipAny contentStyle={{ fontSize: '10px' }} />
                      <BarAny dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {analytics.topProducts.map((entry, index) => (
                          <CellAny key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                        ))}
                      </BarAny>
                    </BarChartAny>
                  </ResponsiveContainerAny>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400 italic">No products sold yet.</div>
                )}
                <div className="text-[10px] text-slate-400 text-center italic mt-2">Charts refresh live on checkout!</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* POS REGISTER TAB */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Products grid */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search products by Name/SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesList.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Grid rendering */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className={`flex flex-col justify-between p-3.5 border rounded-xl bg-white dark:bg-slate-800 text-left transition-all hover:shadow-md hover:border-blue-500 relative group overflow-hidden ${
                      product.stock_quantity <= 0 ? 'opacity-60 cursor-not-allowed border-slate-200' : 'border-slate-100 dark:border-slate-700/50'
                    }`}
                    disabled={product.stock_quantity <= 0}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">{product.category || 'General'}</span>
                        {product.stock_quantity <= product.reorder_level && product.stock_quantity > 0 && (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 text-[8px] py-0 px-1">Low</Badge>
                        )}
                        {product.stock_quantity <= 0 && (
                          <Badge variant="destructive" className="text-[8px] py-0 px-1">OOS</Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-1 line-clamp-1">{product.name}</h4>
                      {product.sku && <p className="text-[9px] font-mono text-slate-400 mt-0.5">{product.sku}</p>}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">ZMW {product.selling_price.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Qty: {product.stock_quantity}</span>
                    </div>

                    <div className="absolute top-0 right-0 h-1 w-full bg-blue-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                  </button>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full bg-slate-50 dark:bg-slate-800/30 p-12 text-center text-slate-400 border border-slate-100 rounded-2xl italic text-xs">No products match filters. Add items in inventory first.</div>
                )}
              </div>
            </div>

            {/* Cart & Customer Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-slate-200 dark:border-slate-800 shadow-lg sticky top-6">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    Register Cart
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-4 space-y-5">
                  {/* Buyer Select info */}
                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div className="flex gap-2">
                      {['civilian', 'student', 'staff'].map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setBuyerType(type as any);
                            setBuyerId('');
                            setBuyerName('');
                          }}
                          className={`flex-1 text-[10px] font-bold uppercase py-1.5 px-1 rounded-md border transition-all ${
                            buyerType === type
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {buyerType === 'civilian' ? (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buyer Name</Label>
                        <Input
                          placeholder="e.g. Guest Customer / Civilian"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search Profile</Label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            placeholder={`Search ${buyerType}...`}
                            value={profileSearch}
                            onChange={(e) => setProfileSearch(e.target.value)}
                            className="pl-8 text-xs h-8"
                          />
                        </div>

                        {profileSearch.trim().length > 0 && (
                          <div className="max-h-36 overflow-y-auto border rounded-lg bg-white dark:bg-slate-950 mt-1 divide-y divide-slate-100 text-xs">
                            {filteredProfiles
                              .filter(p => p.role === (buyerType === 'student' ? 'student' : 'teacher'))
                              .map(p => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    setBuyerId(p.id);
                                    setBuyerName(p.full_name);
                                    setProfileSearch('');
                                  }}
                                  className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex justify-between items-center"
                                >
                                  <span className="font-semibold">{p.full_name}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">{p.email || 'No email'}</span>
                                </button>
                              ))}
                          </div>
                        )}

                        {buyerId && (
                          <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg text-xs mt-2 border border-blue-100 dark:border-blue-900/40">
                            <div>
                              <p className="font-bold text-blue-900 dark:text-blue-300">{buyerName}</p>
                              <p className="text-[10px] text-blue-600 capitalize">{selectedProfileDetails?.role}</p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-red-50 text-slate-400 hover:text-red-600" onClick={() => { setBuyerId(''); setBuyerName(''); }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cart Item rows */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item.product_id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-xl text-xs hover:border-slate-300 transition-all">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-black text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ZMW {item.unit_price.toFixed(2)} each</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, -1)}
                            className="w-6 h-6 rounded-md border flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-slate-800 dark:text-slate-100">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product_id, 1)}
                            className="w-6 h-6 rounded-md border flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.product_id)}
                            className="w-6 h-6 text-red-500 hover:text-red-700 ml-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {cart.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl text-slate-400 gap-2">
                        <ShoppingCart className="h-6 w-6 stroke-[1.5]" />
                        <span className="text-xs">Your sales cart is empty.</span>
                      </div>
                    )}
                  </div>

                  {/* Payment method selection */}
                  {cart.length > 0 && (
                    <div className="space-y-1.5 border-t pt-4">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</Label>
                      <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Payment Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">💵 Cash</SelectItem>
                          <SelectItem value="Mobile Money">📱 Mobile Money</SelectItem>
                          <SelectItem value="School Wallet">💳 School Wallet</SelectItem>
                          <SelectItem value="Other">🔄 Other Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Total calculation & checkout button */}
                  {cart.length > 0 && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex justify-between items-center font-black">
                        <span className="text-xs text-slate-500 dark:text-slate-400">GRAND TOTAL</span>
                        <span className="text-lg text-blue-600 dark:text-blue-400">ZMW {totalCartCost.toFixed(2)}</span>
                      </div>

                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold tracking-wide"
                        onClick={handleCheckout}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                        COMPLETE REGISTRATION
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* INVENTORY MANAGEMENT TAB */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="inventory" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search products/SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleOpenAddProduct} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Product Name</TableHead>
                  <TableHead className="font-bold">SKU</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold text-right">Cost Price</TableHead>
                  <TableHead className="font-bold text-right">Selling Price</TableHead>
                  <TableHead className="font-bold text-center">Stock</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const isLow = product.stock_quantity <= product.reorder_level;
                  const isOOS = product.stock_quantity <= 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-black text-slate-800 dark:text-slate-200">
                        {product.name}
                        {product.description && <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">{product.description}</p>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{product.sku || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-semibold">{product.category || 'General'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">ZMW {product.cost_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-extrabold text-blue-600">ZMW {product.selling_price.toFixed(2)}</TableCell>
                      <TableCell className="text-center font-bold">{product.stock_quantity}</TableCell>
                      <TableCell className="text-center">
                        {isOOS ? (
                          <Badge variant="destructive">Out Of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 text-slate-500 hover:text-slate-800" onClick={() => handleOpenEditProduct(product)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50 text-slate-400 hover:text-red-600" onClick={() => handleDeleteProduct(product.id, product.name)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="p-8 text-center text-slate-400 italic">No products found matching active filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* STAFF ASSIGNMENTS TAB */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tuckshop Staff Assignments</h3>
            <Button onClick={() => setIsStaffModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Cashier
            </Button>
          </div>

          <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Operator Name</TableHead>
                  <TableHead className="font-bold">Base Role</TableHead>
                  <TableHead className="font-bold">Tuckshop Role</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                      {member.profile?.full_name}
                      {member.profile?.email && <p className="text-[10px] text-slate-400 font-mono font-normal mt-0.5">{member.profile.email}</p>}
                    </TableCell>
                    <TableCell className="capitalize text-xs text-slate-500">{member.profile?.role}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 font-bold text-[10px]">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <button onClick={() => handleUpdateStaffStatus(member.id, member.status)}>
                        {member.status === 'Active' ? (
                          <Badge className="bg-green-600 hover:bg-green-700 cursor-pointer">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-400 hover:bg-slate-500 cursor-pointer">Inactive</Badge>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-50 text-slate-400 hover:text-red-600" onClick={() => handleDeleteStaff(member.id)}>
                        <Trash2 className="h-3.5 w-3.5 animate-none" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {staff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-slate-400 italic">No operators or staff assignments configured. Admins hold access by default.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------- */}
        {/* SALES LOG TAB */}
        {/* ---------------------------------------------------- */}
        <TabsContent value="sales-log" className="mt-4">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Transaction Date</TableHead>
                  <TableHead className="font-bold">Buyer Details</TableHead>
                  <TableHead className="font-bold">Payment Method</TableHead>
                  <TableHead className="font-bold">Cashier</TableHead>
                  <TableHead className="font-bold">Items Purchased</TableHead>
                  <TableHead className="font-bold text-right">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => {
                  const dateStr = new Date(sale.created_at).toLocaleString();
                  const cashier = sale.sold_by_profile?.full_name || 'System Admin';
                  
                  // Buyer detail text
                  let buyerDetailsStr = 'Civilian Guest';
                  if (sale.buyer_type === 'student' || sale.buyer_type === 'staff') {
                    buyerDetailsStr = `${sale.buyer_profile?.full_name || sale.buyer_name || 'Deleted User'} (${sale.buyer_type.toUpperCase()})`;
                  } else if (sale.buyer_name) {
                    buyerDetailsStr = sale.buyer_name;
                  }

                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="text-xs text-slate-500 font-mono">{dateStr}</TableCell>
                      <TableCell className="font-bold text-slate-800 dark:text-slate-100">{buyerDetailsStr}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-300">{sale.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{cashier}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                        {sale.items?.map((item: any) => `${item.product?.name || 'Item'} (x${item.quantity})`).join(', ') || '-'}
                      </TableCell>
                      <TableCell className="text-right font-black text-blue-600 text-sm">ZMW {Number(sale.total_amount).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}

                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-8 text-center text-slate-400 italic">No sales transactions logged in history.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------------------------------------------------- */}
      {/* PRODUCT DIALOG MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle className="font-black tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              <DialogDescription className="text-xs">Fill in product specs, vendor metrics, and stock thresholds.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_name" className="text-right font-bold uppercase tracking-wider text-slate-400">Name *</Label>
                <Input
                  id="prod_name"
                  className="col-span-3"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Exercise Book"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_sku" className="text-right font-bold uppercase tracking-wider text-slate-400">SKU / Code</Label>
                <Input
                  id="prod_sku"
                  className="col-span-3 font-mono"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="e.g. EXB-74"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_category" className="text-right font-bold uppercase tracking-wider text-slate-400">Category</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(val) => setProductForm({ ...productForm, category: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Snacks">🍎 Snacks & Drinks</SelectItem>
                    <SelectItem value="Stationery">✏️ Stationery & Books</SelectItem>
                    <SelectItem value="Uniforms">👕 Uniforms & Badges</SelectItem>
                    <SelectItem value="Toiletries">🧼 Toiletries</SelectItem>
                    <SelectItem value="General">📦 General Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_desc" className="text-right font-bold uppercase tracking-wider text-slate-400">Description</Label>
                <Input
                  id="prod_desc"
                  className="col-span-3"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="e.g. 120 pages A4 ruling"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_cost" className="text-right font-bold uppercase tracking-wider text-slate-400">Cost Price *</Label>
                <Input
                  id="prod_cost"
                  type="number"
                  step="0.01"
                  className="col-span-3"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  placeholder="Price paid to supplier in ZMW"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_selling" className="text-right font-bold uppercase tracking-wider text-slate-400">Selling Price *</Label>
                <Input
                  id="prod_selling"
                  type="number"
                  step="0.01"
                  className="col-span-3 font-extrabold text-blue-600"
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  placeholder="Store retail price in ZMW"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_stock" className="text-right font-bold uppercase tracking-wider text-slate-400">Stock Qty *</Label>
                <Input
                  id="prod_stock"
                  type="number"
                  className="col-span-3"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                  placeholder="Starting items count"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prod_reorder" className="text-right font-bold uppercase tracking-wider text-slate-400">Reorder Alert</Label>
                <Input
                  id="prod_reorder"
                  type="number"
                  className="col-span-3"
                  value={productForm.reorder_level}
                  onChange={(e) => setProductForm({ ...productForm, reorder_level: e.target.value })}
                  placeholder="Default: 5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isActionLoading}>
                {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* STAFF DIALOG MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleAssignStaff}>
            <DialogHeader>
              <DialogTitle className="font-black tracking-tight">Assign Tuckshop Cashier</DialogTitle>
              <DialogDescription className="text-xs">Grant a teacher or student permissions to login and log store sales.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="staff_profile" className="font-bold uppercase tracking-wider text-slate-400">Search Profile</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name or email..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    className="pl-8 text-xs"
                  />
                </div>

                {profileSearch.trim().length > 0 && (
                  <div className="max-h-36 overflow-y-auto border rounded-lg bg-white dark:bg-slate-950 mt-1 divide-y divide-slate-100">
                    {profiles
                      .filter(p => p.full_name.toLowerCase().includes(profileSearch.toLowerCase()) || (p.email && p.email.toLowerCase().includes(profileSearch.toLowerCase())))
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setStaffForm({ ...staffForm, user_id: p.id });
                            setProfileSearch(p.full_name);
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex justify-between items-center text-xs"
                        >
                          <span className="font-semibold">{p.full_name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">{p.role}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff_role" className="text-right font-bold uppercase tracking-wider text-slate-400">Role</Label>
                <Select
                  value={staffForm.role}
                  onValueChange={(val: any) => setStaffForm({ ...staffForm, role: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Seller">Seller / Cashier</SelectItem>
                    <SelectItem value="Manager">Manager / Auditor</SelectItem>
                    <SelectItem value="Assistant">Assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="staff_status" className="text-right font-bold uppercase tracking-wider text-slate-400">Status</Label>
                <Select
                  value={staffForm.status}
                  onValueChange={(val: any) => setStaffForm({ ...staffForm, status: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">🟢 Active</SelectItem>
                    <SelectItem value="Inactive">🔴 Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isActionLoading}>
                {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
