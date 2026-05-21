import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Receipt, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function SchoolFeesManagement() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencySettings, setCurrencySettings] = useState({ default: 'ZMW', supported: ['ZMW'] });
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeType, setFeeType] = useState('tuition');
  const [applicableTo, setApplicableTo] = useState('grade');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch settings
      const settingsRes = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setCurrencySettings({
          default: settingsData.default_currency || 'ZMW',
          supported: JSON.parse(settingsData.supported_currencies || '["ZMW"]')
        });
      }

      // Fetch school type and determine available grades
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', session?.user?.id).single();
      if (profile?.school_id) {
        const { data: school } = await supabase.from('schools').select('school_type').eq('id', profile.school_id).single();
        if (school?.school_type) {
          const { data: schoolType } = await supabase.from('school_types').select('description').eq('name', school.school_type).single();
          if (schoolType?.description) {
            const match = schoolType.description.match(/Grades?\s+(\d+)\s*-\s*(\d+)/i);
            if (match) {
              const start = parseInt(match[1]);
              const end = parseInt(match[2]);
              const grades = [];
              for (let i = start; i <= end; i++) grades.push(`Grade ${i}`);
              setAvailableGrades(grades);
            }
          }
        }
        
        // Fetch classes
        const { data: classData } = await supabase.from('classes').select('id, name').eq('school_id', profile.school_id).order('name');
        if (classData) setClasses(classData);
      }

      // Fetch structures
      const structRes = await fetch('/api/finance/fees/structures', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (structRes.ok) setFeeStructures(await structRes.json());

      // Fetch invoices
      const invRes = await fetch('/api/finance/invoices', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (invRes.ok) setInvoices(await invRes.json());

    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load finance data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/finance/fees/structures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error(await res.text());

      toast({ title: 'Success', description: 'Fee structure created.' });
      fetchData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="invoices" className="flex items-center gap-2"><FileText className="h-4 w-4"/> Student Invoices</TabsTrigger>
          <TabsTrigger value="structures" className="flex items-center gap-2"><Receipt className="h-4 w-4"/> Fee Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Track payments from students.</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No invoices found. Generate invoices to begin tracking fees.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="font-medium">{inv.profiles?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{inv.profiles?.email}</div>
                        </TableCell>
                        <TableCell>{inv.fee_structures?.term} ({inv.fee_structures?.academic_year})</TableCell>
                        <TableCell>{inv.currency} {inv.total_amount}</TableCell>
                        <TableCell>{inv.currency} {inv.amount_paid}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {inv.currency} {(inv.total_amount - inv.amount_paid).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-800' : 
                            inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fee Structures</CardTitle>
                <CardDescription>Define how much each grade pays per term.</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2"/> New Structure</Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateStructure}>
                    <DialogHeader>
                      <DialogTitle>Create Fee Structure</DialogTitle>
                      <DialogDescription>Set a fee amount. Choosing "All Terms" applies it to Term 1, 2, and 3.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Fee Type</Label>
                        <select 
                          name="fee_type" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" 
                          value={feeType} 
                          onChange={(e) => setFeeType(e.target.value)}
                        >
                          <option value="tuition">Regular Tuition</option>
                          <option value="custom">Custom / Once-off Payment</option>
                        </select>
                      </div>

                      {feeType === 'custom' && (
                        <div className="space-y-2">
                          <Label>Applies To</Label>
                          <select 
                            name="applicable_to" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={applicableTo}
                            onChange={(e) => setApplicableTo(e.target.value)}
                          >
                            <option value="school">Entire School</option>
                            <option value="grade">Specific Grade</option>
                            <option value="class">Specific Class</option>
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {(feeType === 'tuition' || applicableTo === 'grade') && (
                          <div className="space-y-2">
                            <Label>Grade</Label>
                            {availableGrades.length > 0 ? (
                              <select name="grade" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required>
                                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            ) : (
                              <Input name="grade" placeholder="e.g. Grade 1" required />
                            )}
                          </div>
                        )}

                        {feeType === 'custom' && applicableTo === 'school' && (
                          <div className="space-y-2">
                            <Label>Target</Label>
                            <Input name="grade" value="All Grades" readOnly className="bg-muted" />
                          </div>
                        )}

                        {feeType === 'custom' && applicableTo === 'class' && (
                          <div className="space-y-2">
                            <Label>Class</Label>
                            <select name="grade" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required>
                              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                          </div>
                        )}

                        {feeType === 'tuition' ? (
                          <div className="space-y-2">
                            <Label>Term</Label>
                            <select name="term" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required>
                              <option value="All Terms">All Terms (Per Term)</option>
                              <option value="Term 1">Term 1</option>
                              <option value="Term 2">Term 2</option>
                              <option value="Term 3">Term 3</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Term</Label>
                            <Input name="term" value="Once-off" readOnly className="bg-muted" />
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Input name="academic_year" type="number" defaultValue={new Date().getFullYear()} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <select name="currency" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" required defaultValue={currencySettings.default}>
                            {currencySettings.supported.map((c: string) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input name="amount" type="number" step="0.01" min="0" placeholder="e.g 1000" required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input name="description" list="fee-descriptions" placeholder="e.g. School Fees, Boarding Fees, or custom notes" />
                        <datalist id="fee-descriptions">
                          <option value="School Fees" />
                          <option value="Boarding Fees" />
                        </datalist>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {feeStructures.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No fee structures defined.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructures.map((fs) => (
                      <TableRow key={fs.id}>
                        <TableCell className="font-medium">{fs.grade}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fs.fee_type === 'custom' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {fs.fee_type === 'custom' ? 'Custom' : 'Tuition'}
                          </span>
                        </TableCell>
                        <TableCell>{fs.term}</TableCell>
                        <TableCell>{fs.academic_year}</TableCell>
                        <TableCell>{fs.currency} {fs.amount}</TableCell>
                        <TableCell className="text-muted-foreground">{fs.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
