
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Package, 
  Truck, 
  ShoppingCart, 
  Utensils, 
  Plus, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function FeedingProgramManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Dialog states
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [procForm, setProcForm] = useState({ itemName: '', quantity: '', unit: '', estimatedCost: '' });
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [mealForm, setMealForm] = useState({ mealType: '', beneficiaries: '', itemsUsed: '' });

  // State for data
  const [inventory, setInventory] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [invRes, delRes, procRes, mealRes] = await Promise.all([
        fetch('/api/school/feeding-program/inventory', { headers }),
        fetch('/api/school/feeding-program/deliveries', { headers }),
        fetch('/api/school/feeding-program/procurements', { headers }),
        fetch('/api/school/feeding-program/meals', { headers })
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (delRes.ok) setDeliveries(await delRes.json());
      if (procRes.ok) setProcurements(await procRes.json());
      if (mealRes.ok) setMeals(await mealRes.json());

    } catch (error) {
      console.error('Error fetching feeding program data:', error);
      toast({ title: "Error", description: "Failed to load module data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procForm.itemName || !procForm.quantity || !procForm.unit || !procForm.estimatedCost) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/feeding-program/procurements', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          item_name: procForm.itemName, 
          quantity: Number(procForm.quantity), 
          unit: procForm.unit, 
          estimated_cost: Number(procForm.estimatedCost) 
        })
      });
      
      if (res.ok) {
        toast({ title: "Success", description: "Procurement request submitted." });
        setIsProcurementModalOpen(false);
        setProcForm({ itemName: '', quantity: '', unit: '', estimatedCost: '' });
        const procRes = await fetch('/api/school/feeding-program/procurements', { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (procRes.ok) setProcurements(await procRes.json());
      } else {
        toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  const handleMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealForm.mealType || !mealForm.beneficiaries || !mealForm.itemsUsed) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const items_used: any = {};
    mealForm.itemsUsed.split(',').forEach(i => {
      const [k, v] = i.split(':');
      if (k && v) items_used[k.trim()] = v.trim();
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/feeding-program/meals', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          date: new Date().toISOString().split('T')[0],
          meal_type: mealForm.mealType, 
          beneficiaries_count: Number(mealForm.beneficiaries), 
          items_used 
        })
      });
      
      if (res.ok) {
        toast({ title: "Success", description: "Meal record added." });
        setIsMealModalOpen(false);
        setMealForm({ mealType: '', beneficiaries: '', itemsUsed: '' });
        const mealsRes = await fetch('/api/school/feeding-program/meals', { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        if (mealsRes.ok) setMeals(await mealsRes.json());
      } else {
        toast({ title: "Error", description: "Failed to add meal record.", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Feeding Program</h2>
          <p className="text-muted-foreground text-lg">Manage school snacks, meals, and food inventory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="rounded-xl">
            <History className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" /> Log Daily Meal
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <TabsTrigger value="dashboard" className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <BarChart3 className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="inventory" className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Package className="h-4 w-4 mr-2" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Truck className="h-4 w-4 mr-2" /> Deliveries
          </TabsTrigger>
          <TabsTrigger value="procurement" className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <ShoppingCart className="h-4 w-4 mr-2" /> Procurement
          </TabsTrigger>
          <TabsTrigger value="meals" className="px-4 py-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Utensils className="h-4 w-4 mr-2" /> Meals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <Card className="border-none shadow-md bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-xs font-bold uppercase text-blue-500">Total Beneficiaries</CardDescription>
                   <CardTitle className="text-3xl">{meals.reduce((acc, m) => acc + m.beneficiaries_count, 0)}</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      Across {meals.length} meal logs
                   </p>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-xs font-bold uppercase text-orange-500">Items in Stock</CardDescription>
                   <CardTitle className="text-3xl">{inventory.length}</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs text-muted-foreground">Across {inventory.filter(i => Number(i.quantity) < 10).length} low stock items</p>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-xs font-bold uppercase text-emerald-500">Recent Deliveries</CardDescription>
                   <CardTitle className="text-3xl">{deliveries.filter(d => d.status === 'Received').length}</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs text-muted-foreground">Successful arrivals this term</p>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="pb-2">
                   <CardDescription className="text-xs font-bold uppercase text-purple-500">Pending Requests</CardDescription>
                   <CardTitle className="text-3xl">{procurements.filter(p => p.status === 'Pending').length}</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-xs text-muted-foreground">Awaiting district approval</p>
                </CardContent>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <Card className="lg:col-span-2 border-none shadow-md">
                <CardHeader>
                   <CardTitle>Recent Meal Distribution</CardTitle>
                   <CardDescription>Daily feeding activity at the school.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                      {meals.slice(0, 5).map((meal, idx) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                  <Utensils className="h-5 w-5" />
                               </div>
                               <div>
                                  <p className="font-semibold text-sm">{meal.meal_type}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(meal.date).toLocaleDateString()}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-sm font-bold">{meal.beneficiaries_count} Students</p>
                               <p className="text-[10px] text-muted-foreground">Served successfully</p>
                            </div>
                         </div>
                      ))}
                      {meals.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground italic">No meals logged yet.</div>
                      )}
                   </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md">
                <CardHeader>
                   <CardTitle>Low Stock Alerts</CardTitle>
                   <CardDescription>Items needing replenishment.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                      {inventory.filter(i => Number(i.quantity) < 20).map((item, idx) => (
                         <div key={idx} className="flex items-center gap-3 p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl">
                            <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg text-rose-600 dark:text-rose-400">
                               <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                               <p className="font-semibold text-sm">{item.item_name}</p>
                               <p className="text-xs text-rose-600 font-bold">{item.quantity} {item.unit} remaining</p>
                            </div>
                         </div>
                      ))}
                      {inventory.filter(i => Number(i.quantity) < 20).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground italic">All stock levels healthy.</div>
                      )}
                    </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
           <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                   <CardTitle>Current Inventory</CardTitle>
                   <CardDescription>Stock levels for feeding program supplies.</CardDescription>
                </div>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Report</Button>
              </CardHeader>
              <CardContent>
                 <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-900">
                          <tr>
                             <th className="text-left p-4 font-bold">Item Name</th>
                             <th className="text-left p-4 font-bold">In Stock</th>
                             <th className="text-left p-4 font-bold">Unit</th>
                             <th className="text-left p-4 font-bold">Status</th>
                             <th className="text-left p-4 font-bold">Last Updated</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {inventory.map((item, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="p-4 font-medium">{item.item_name}</td>
                                <td className="p-4 font-bold">{item.quantity}</td>
                                <td className="p-4">{item.unit}</td>
                                <td className="p-4">
                                   <Badge className={Number(item.quantity) < 20 ? 'bg-amber-500' : 'bg-emerald-500'}>
                                      {Number(item.quantity) < 20 ? 'Low Stock' : 'Healthy'}
                                   </Badge>
                                </td>
                                <td className="p-4 text-xs text-muted-foreground">{new Date(item.last_updated).toLocaleString()}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
           {/* Implement Deliveries List */}
           <Card className="border-none shadow-md">
              <CardHeader>
                 <CardTitle>Supply Deliveries</CardTitle>
                 <CardDescription>Track food shipments arriving at your school.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-4">
                    {deliveries.map((delivery, idx) => (
                       <div key={idx} className="p-4 bg-white dark:bg-slate-800 border rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex gap-4 items-center">
                             <div className={cn(
                               "p-3 rounded-2xl",
                               delivery.status === 'Received' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                             )}>
                                <Truck className="h-6 w-6" />
                             </div>
                             <div>
                                <h4 className="font-bold text-lg">{delivery.item_name}</h4>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                   <Clock className="h-3 w-3" />
                                   Exp. Arrival: {new Date(delivery.delivery_date).toLocaleDateString()}
                                </p>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <Badge className={
                                delivery.status === 'Received' ? 'bg-emerald-500' : 
                                delivery.status === 'Dispatched' ? 'bg-blue-500' : 'bg-amber-500'
                             }>
                                {delivery.status}
                             </Badge>
                             <p className="text-sm font-bold">{delivery.quantity} {delivery.unit}</p>
                             {delivery.status !== 'Received' && (
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase tracking-wider" onClick={async () => {
                                   try {
                                      const res = await fetch(`/api/school/feeding-program/deliveries/${delivery.id}/receive`, {
                                         method: 'POST',
                                         headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
                                      });
                                      if (res.ok) {
                                         // Refresh data
                                         const [invRes, delRes] = await Promise.all([
                                            fetch('/api/school/feeding-program/inventory', { headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }),
                                            fetch('/api/school/feeding-program/deliveries', { headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } })
                                         ]);
                                         if (invRes.ok) setInventory(await invRes.json());
                                         if (delRes.ok) setDeliveries(await delRes.json());
                                      }
                                   } catch (e) { console.error(e); }
                                }}>Confirm Receipt</Button>
                             )}
                          </div>
                       </div>
                    ))}
                    {deliveries.length === 0 && (
                       <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed">
                          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-muted-foreground">No recent deliveries recorded.</p>
                       </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-4">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Supply Requests</h3>
              <Button size="sm" className="shadow-lg shadow-primary/20" onClick={() => setIsProcurementModalOpen(true)}>
                 <Plus className="h-4 w-4 mr-2" /> Request Supplies
              </Button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {procurements.map((proc, idx) => (
                 <Card key={idx} className="border-none shadow-md overflow-hidden group">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                       <CardTitle className="text-base">{proc.item_name}</CardTitle>
                       <Badge className={
                          proc.status === 'Approved' ? 'bg-emerald-500' : 
                          proc.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                       }>
                          {proc.status}
                       </Badge>
                    </CardHeader>
                    <CardContent className="pt-2">
                       <div className="flex justify-between text-sm mb-4">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-bold">{proc.quantity} {proc.unit}</span>
                       </div>
                       <div className="flex justify-between text-sm mb-4">
                          <span className="text-muted-foreground">Est. Cost:</span>
                          <span className="font-bold text-emerald-600">ZK {proc.estimated_cost}</span>
                       </div>
                       <div className="pt-4 border-t flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground italic">Requested {new Date(proc.created_at).toLocaleDateString()}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest text-primary hover:bg-primary/5">Details <ArrowRight className="h-3 w-3 ml-1" /></Button>
                       </div>
                    </CardContent>
                 </Card>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="meals" className="space-y-4">
           <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>Daily Meal Records</CardTitle>
                    <CardDescription>Historical log of student meal distribution.</CardDescription>
                 </div>
                 <Button size="sm" onClick={() => setIsMealModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> New Entry
                 </Button>
              </CardHeader>
              <CardContent>
                 <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                          <tr>
                             <th className="text-left p-4">Date</th>
                             <th className="text-left p-4">Meal Type</th>
                             <th className="text-left p-4">Beneficiaries</th>
                             <th className="text-left p-4">Items Used</th>
                             <th className="text-left p-4">Recorded By</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y">
                          {meals.map((meal, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">{new Date(meal.date).toLocaleDateString()}</td>
                                <td className="p-4">
                                   <Badge variant="outline">{meal.meal_type}</Badge>
                                </td>
                                <td className="p-4 font-bold text-lg">{meal.beneficiaries_count}</td>
                                <td className="p-4 text-xs max-w-xs truncate">
                                   {Object.entries(meal.items_used || {}).map(([item, qty]) => `${item}: ${qty}`).join(', ')}
                                </td>
                                <td className="p-4 text-slate-500 font-medium">Teacher #{meal.recorded_by?.slice(0, 4)}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Procurement Modal */}
      <Dialog open={isProcurementModalOpen} onOpenChange={setIsProcurementModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Supplies</DialogTitle>
            <DialogDescription>Submit a new procurement request for feeding program supplies.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProcurementSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <Input placeholder="e.g. Maize, Beans, Cooking Oil" value={procForm.itemName} onChange={e => setProcForm({...procForm, itemName: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input type="number" min="1" step="0.01" placeholder="e.g. 50" value={procForm.quantity} onChange={e => setProcForm({...procForm, quantity: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input placeholder="e.g. bags, kg, liters" value={procForm.unit} onChange={e => setProcForm({...procForm, unit: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Cost (ZK)</label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 1500" value={procForm.estimatedCost} onChange={e => setProcForm({...procForm, estimatedCost: e.target.value})} required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsProcurementModalOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Meal Entry Modal */}
      <Dialog open={isMealModalOpen} onOpenChange={setIsMealModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Daily Meal</DialogTitle>
            <DialogDescription>Record a meal distribution and the stock items used.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMealSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Meal Type</label>
                <Select value={mealForm.mealType} onValueChange={v => setMealForm({...mealForm, mealType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Breakfast">Breakfast</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Dinner">Dinner</SelectItem>
                    <SelectItem value="Snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Beneficiaries</label>
                <Input type="number" min="1" placeholder="Number of students" value={mealForm.beneficiaries} onChange={e => setMealForm({...mealForm, beneficiaries: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Items Used</label>
              <Input placeholder="e.g. Maize: 5kg, Beans: 1kg" value={mealForm.itemsUsed} onChange={e => setMealForm({...mealForm, itemsUsed: e.target.value})} required />
              <p className="text-[10px] text-muted-foreground">Format: ItemName: Quantity, ItemName: Quantity</p>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsMealModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
