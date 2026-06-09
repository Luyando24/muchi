import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  Loader2,
  RefreshCcw,
  Search,
  Filter,
  Info,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CalendarEntry {
  id: string;
  year: string;
  type: 'Term' | 'Holiday';
  name: string;
  start_date: string;
  end_date: string;
  midterm_begin: string | null;
  midterm_end: string | null;
}

export default function GovernmentSchoolCalendar() {
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [typeFilter, setTypeFilter] = useState('All');

  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { toast } = useToast();

  const [formData, setFormData] = useState({
    year: '2026',
    type: 'Term' as 'Term' | 'Holiday',
    name: '',
    start_date: '',
    end_date: '',
    midterm_begin: '',
    midterm_end: ''
  });

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/government/calendar', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setCalendar(await res.json());
      } else {
        throw new Error('Failed to load calendar entries');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to load school calendar',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({
      year: new Date().getFullYear().toString(),
      type: 'Term',
      name: '',
      start_date: '',
      end_date: '',
      midterm_begin: '',
      midterm_end: ''
    });
  };

  const handleAddClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (entry: CalendarEntry) => {
    setEditingEntry(entry);
    setFormData({
      year: entry.year,
      type: entry.type,
      name: entry.name,
      start_date: entry.start_date ? entry.start_date.split('T')[0] : '',
      end_date: entry.end_date ? entry.end_date.split('T')[0] : '',
      midterm_begin: entry.midterm_begin ? entry.midterm_begin.split('T')[0] : '',
      midterm_end: entry.midterm_end ? entry.midterm_end.split('T')[0] : ''
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.year) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast({
        title: 'Validation Error',
        description: 'Start date cannot be after end date.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.type === 'Term' && formData.midterm_begin && formData.midterm_end) {
      if (new Date(formData.midterm_begin) > new Date(formData.midterm_end)) {
        toast({
          title: 'Validation Error',
          description: 'Mid-term break start date cannot be after end date.',
          variant: 'destructive'
        });
        return;
      }
      if (new Date(formData.midterm_begin) < new Date(formData.start_date) || new Date(formData.midterm_end) > new Date(formData.end_date)) {
        toast({
          title: 'Validation Error',
          description: 'Mid-term break dates must fall within the term start and end dates.',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = editingEntry ? `/api/government/calendar/${editingEntry.id}` : '/api/government/calendar';
      const method = editingEntry ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        midterm_begin: formData.type === 'Term' ? (formData.midterm_begin || null) : null,
        midterm_end: formData.type === 'Term' ? (formData.midterm_end || null) : null
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Calendar entry ${editingEntry ? 'updated' : 'created'} successfully.`
        });
        setIsFormOpen(false);
        resetForm();
        fetchCalendar();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save calendar entry');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save calendar entry',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/government/calendar/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Calendar entry deleted successfully.'
        });
        setDeleteTargetId(null);
        fetchCalendar();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete calendar entry');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete entry',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/government/calendar/reset', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Calendar restored to standard Ministry guidelines successfully.'
        });
        setIsResetConfirmOpen(false);
        fetchCalendar();
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to reset calendar');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset calendar',
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Filter & Search Logic
  const filteredCalendar = calendar.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          entry.year.includes(searchQuery);
    const matchesYear = yearFilter === 'All' || entry.year === yearFilter;
    const matchesType = typeFilter === 'All' || entry.type === typeFilter;
    return matchesSearch && matchesYear && matchesType;
  }).sort((a, b) => {
    if (a.year !== b.year) return a.year.localeCompare(b.year);
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  const uniqueYears = Array.from(new Set(calendar.map(entry => entry.year))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">School Calendar Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage the national academic terms timeline, midterm breaks, and public holidays.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            onClick={handleAddClick} 
            className="bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl h-10 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsResetConfirmOpen(true)}
            className="border-slate-200 dark:border-slate-700 font-bold rounded-xl h-10"
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Info Warning Alert */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-300 text-sm">System Synchronization Notice</h4>
          <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1 font-medium leading-relaxed">
            Changes to the official term timelines will dynamically adjust the active term and academic year for all schools in the system on their respective start dates. Please verify dates carefully before saving.
          </p>
        </div>
      </div>

      {/* Filters card */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-80 shadow-inner focus-within:ring-2 focus-within:ring-blue-500/20">
            <Search className="h-4 w-4 text-slate-400" />
            <input 
              placeholder="Search by event name or year..." 
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-slate-900 dark:text-white placeholder:text-slate-400" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Year:</span>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px] h-9 rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Type:</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-9 rounded-xl border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Term">Term</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar List */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredCalendar.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 h-64 text-slate-400 italic">
              <Calendar className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
              <p>No calendar entries matched your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Year</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Event Name</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Starts</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ends</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mid-Term Break</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredCalendar.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {entry.year}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          className={entry.type === 'Term' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-none' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-none'}
                        >
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {entry.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(entry.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(entry.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {entry.midterm_begin && entry.midterm_end ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {new Date(entry.midterm_begin).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(entry.midterm_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditClick(entry)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteTargetId(entry.id)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingEntry ? 'Edit Calendar Entry' : 'Create Calendar Entry'}
              </DialogTitle>
              <DialogDescription>
                Provide the details of the term timeline or holiday.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year" className="font-semibold">Academic Year *</Label>
                  <Input 
                    id="year" 
                    name="year" 
                    value={formData.year} 
                    onChange={handleInputChange} 
                    placeholder="e.g. 2026" 
                    required 
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="font-semibold">Event Type *</Label>
                  <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term">Term</SelectItem>
                      <SelectItem value="Holiday">Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Event Name *</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="e.g. Term 1, Independence Day" 
                  required 
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date" className="font-semibold">Start Date *</Label>
                  <Input 
                    type="date" 
                    id="start_date" 
                    name="start_date" 
                    value={formData.start_date} 
                    onChange={handleInputChange} 
                    required 
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className="font-semibold">End Date *</Label>
                  <Input 
                    type="date" 
                    id="end_date" 
                    name="end_date" 
                    value={formData.end_date} 
                    onChange={handleInputChange} 
                    required 
                    className="rounded-xl"
                  />
                </div>
              </div>

              {formData.type === 'Term' && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Mid-Term Break (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="midterm_begin" className="text-slate-500">Break Begins</Label>
                      <Input 
                        type="date" 
                        id="midterm_begin" 
                        name="midterm_begin" 
                        value={formData.midterm_begin} 
                        onChange={handleInputChange} 
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="midterm_end" className="text-slate-500">Break Ends</Label>
                      <Input 
                        type="date" 
                        id="midterm_end" 
                        name="midterm_end" 
                        value={formData.midterm_end} 
                        onChange={handleInputChange} 
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-xl">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingEntry ? 'Save Changes' : 'Create Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog 
        open={deleteTargetId !== null} 
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }} 
        title="Delete Calendar Entry" 
        description="Are you sure you want to delete this calendar event? This will remove it from the national ministry guidelines and may affect active terms synchronization." 
        confirmLabel="Delete" 
        variant="danger" 
        loading={isDeleting} 
        onConfirm={handleDeleteConfirm} 
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog 
        open={isResetConfirmOpen} 
        onOpenChange={setIsResetConfirmOpen} 
        title="Reset Calendar to Standard" 
        description="Are you sure you want to restore the calendar to standard dates? This will clear all current events and reseed the entire calendar from the standard 2026-2030 Excel layout." 
        confirmLabel="Reset Calendar" 
        variant="warning" 
        loading={isResetting} 
        onConfirm={handleResetConfirm} 
      />
    </div>
  );
}
