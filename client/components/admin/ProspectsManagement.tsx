import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Loader2, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  FileText, 
  Filter, 
  TrendingUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface Prospect {
  id: string;
  school_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'New' | 'Contacted' | 'Demo Scheduled' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function ProspectsManagement() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialog & Form States
  const [isOpen, setIsOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'New' | 'Contacted' | 'Demo Scheduled' | 'Negotiation' | 'Closed Won' | 'Closed Lost'>('New');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/prospects', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch prospects');
      const data = await response.json();
      setProspects(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error fetching prospects",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProspect(null);
    setSchoolName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setStatus('New');
    setNotes('');
    setIsOpen(true);
  };

  const handleOpenEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setSchoolName(prospect.school_name);
    setContactName(prospect.contact_name || '');
    setEmail(prospect.email || '');
    setPhone(prospect.phone || '');
    setAddress(prospect.address || '');
    setStatus(prospect.status);
    setNotes(prospect.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const method = editingProspect ? 'PUT' : 'POST';
      const url = editingProspect ? `/api/admin/prospects/${editingProspect.id}` : '/api/admin/prospects';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          school_name: schoolName,
          contact_name: contactName,
          email,
          phone,
          address,
          status,
          notes
        })
      });

      if (!response.ok) throw new Error(editingProspect ? 'Failed to update prospect' : 'Failed to create prospect');

      toast({
        title: "Success",
        description: editingProspect ? "Prospect updated successfully" : "Prospect added successfully"
      });
      
      setIsOpen(false);
      fetchProspects();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving prospect",
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this prospect?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/prospects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete prospect');

      toast({
        title: "Deleted",
        description: "Prospect removed successfully"
      });
      fetchProspects();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting prospect",
        description: error.message
      });
    }
  };

  // Filter prospects
  const filteredProspects = prospects.filter(p => {
    const matchesSearch = 
      p.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination Math
  const totalItems = filteredProspects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProspects = filteredProspects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <Badge variant="outline" className="border-blue-500 text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20">New</Badge>;
      case 'Contacted':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-none font-bold">Contacted</Badge>;
      case 'Demo Scheduled':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none font-bold">Demo Scheduled</Badge>;
      case 'Negotiation':
        return <Badge variant="outline" className="border-purple-500 text-purple-600 font-bold bg-purple-50 dark:bg-purple-900/20">Negotiation</Badge>;
      case 'Closed Won':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none font-bold">Closed Won</Badge>;
      case 'Closed Lost':
        return <Badge variant="destructive" className="font-bold">Closed Lost</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Prospects & Leads Pipeline</h2>
          <p className="text-muted-foreground">Add and manage potential school leads in the registration pipeline</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <Button onClick={handleOpenCreate} className="shadow-lg shadow-blue-500/25 font-bold">
            <Plus className="mr-2 h-4 w-4" /> Add Prospect
          </Button>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingProspect ? 'Edit Prospect Lead' : 'Add Lead Prospect'}</DialogTitle>
                <DialogDescription>
                  Enter the school details and their current status in the sales funnel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prospect-school-name">School Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="prospect-school-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Hilltop Heights Academy"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prospect-contact-name">Contact Person</Label>
                    <Input 
                      id="prospect-contact-name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Dr. Mwamba"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prospect-status">Lead Stage Status</Label>
                    <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                      <SelectTrigger id="prospect-status">
                        <SelectValue placeholder="Stage status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New Lead</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
                        <SelectItem value="Negotiation">Negotiation</SelectItem>
                        <SelectItem value="Closed Won">Closed Won (Registered)</SelectItem>
                        <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prospect-email">Email</Label>
                    <Input 
                      id="prospect-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@school.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prospect-phone">Phone</Label>
                    <Input 
                      id="prospect-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +260977000000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prospect-address">Address / City</Label>
                  <Input 
                    id="prospect-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Lusaka, Zambia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prospect-notes">Correspondence Notes</Label>
                  <Textarea 
                    id="prospect-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Log demo feedback, pricing constraints, or follow-up details..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                  {editingProspect ? 'Save Changes' : 'Create Lead'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Leads</p>
              <h3 className="text-2xl font-black mt-1">{prospects.length}</h3>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Demo / Negotiation</p>
              <h3 className="text-2xl font-black mt-1">
                {prospects.filter(p => p.status === 'Demo Scheduled' || p.status === 'Negotiation').length}
              </h3>
            </div>
            <Badge className="bg-indigo-500">Pipeline</Badge>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Converted (Won)</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-600">
                {prospects.filter(p => p.status === 'Closed Won').length}
              </h3>
            </div>
            <Badge className="bg-emerald-500 text-white font-bold">Success</Badge>
          </CardContent>
        </Card>
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Conversion Rate</p>
              <h3 className="text-2xl font-black mt-1">
                {prospects.length > 0 
                  ? `${Math.round((prospects.filter(p => p.status === 'Closed Won').length / prospects.length) * 100)}%`
                  : '0%'}
              </h3>
            </div>
            <Badge variant="outline" className="border-slate-300">Conversion</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Pipeline Stages</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
              <SelectItem value="Negotiation">Negotiation</SelectItem>
              <SelectItem value="Closed Won">Closed Won</SelectItem>
              <SelectItem value="Closed Lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-950 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="font-semibold">School Name</TableHead>
              <TableHead className="font-semibold">Contact Person</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Pipeline Stage</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="w-12 text-right font-semibold pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs text-muted-foreground mt-2">Loading pipeline leads...</p>
                </TableCell>
              </TableRow>
            ) : paginatedProspects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No prospects found in this stage.
                </TableCell>
              </TableRow>
            ) : (
              paginatedProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-bold flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-400 shrink-0" />
                    {prospect.school_name}
                  </TableCell>
                  <TableCell className="font-medium">
                    {prospect.contact_name ? (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {prospect.contact_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.email ? (
                      <a href={`mailto:${prospect.email}`} className="flex items-center gap-1.5 text-blue-500 hover:underline">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {prospect.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.phone ? (
                      <span className="flex items-center gap-1.5 text-slate-650 font-medium">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {prospect.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.address ? (
                      <span className="flex items-center gap-1.5 text-slate-650">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {prospect.address}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(prospect.status)}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-slate-500" title={prospect.notes}>
                    {prospect.notes || <span className="italic text-slate-350">No notes logged</span>}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenEdit(prospect)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-650 focus:text-red-600"
                          onClick={() => handleDelete(prospect.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Prospect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls 
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        totalItems={totalItems}
      />
    </div>
  );
}
