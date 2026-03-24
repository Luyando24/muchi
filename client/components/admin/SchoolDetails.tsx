import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Trash2, 
  Loader2, 
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Progress } from '@/components/ui/progress';

interface Teacher {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  employment_status: string;
  staff_number?: string;
  created_at: string;
}

interface SchoolDetailsProps {
  schoolId: string;
  schoolName: string;
  onBack: () => void;
}

export default function SchoolDetails({ schoolId, schoolName, onBack }: SchoolDetailsProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, [schoolId]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/schools/${schoolId}/teachers`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch teachers');
      const data = await response.json();
      setTeachers(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(teachers.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    setDeletionProgress(0);
    const BATCH_SIZE = 10;
    const totalToDelete = selectedIds.length;
    let deletedCount = 0;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session found.');

      for (let i = 0; i < totalToDelete; i += BATCH_SIZE) {
        const batch = selectedIds.slice(i, i + BATCH_SIZE);
        
        const response = await fetch(`/api/admin/schools/${schoolId}/teachers/bulk-delete-permanent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ teacherIds: batch })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Deletion batch failed');
        }

        const result = await response.json();
        deletedCount += result.deletedCount || batch.length;
        
        const progress = Math.min(Math.round(((i + batch.length) / totalToDelete) * 100), 100);
        setDeletionProgress(progress);
      }
      
      toast({
        title: "Purge Complete",
        description: `Successfully removed ${deletedCount} teacher accounts permanently.`,
      });
      
      setSelectedIds([]);
      fetchTeachers();
    } catch (error: any) {
      console.error('Bulk deletion error:', error);
      toast({
        variant: "destructive",
        title: "Partial Deletion or Error",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
      setDeletionProgress(0);
      setShowDeleteConfirm(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.staff_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isDeleting} className="hover:bg-slate-200 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Schools
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border shadow-sm">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{schoolName}</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 mt-1">
              <Users className="h-4 w-4 text-blue-500" /> Institution Teacher Directory
            </p>
          </div>
          
          {selectedIds.length > 0 && !isDeleting && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              className="shadow-lg shadow-red-500/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Permanently Remove ({selectedIds.length})
            </Button>
          )}
        </div>

        {isDeleting && (
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                Purging accounts...
              </span>
              <span>{deletionProgress}%</span>
            </div>
            <Progress value={deletionProgress} className="h-2 bg-slate-100 dark:bg-slate-800" />
            <p className="text-xs text-slate-500">Please do not close this window while the operation is in progress.</p>
          </div>
        )}
      </div>

      <Card className="border-none shadow-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Staff Records</CardTitle>
              <CardDescription>Manage permanent teacher accounts for this institution.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email or staff #..."
                className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={teachers.length > 0 && selectedIds.length === teachers.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Full Name</TableHead>
                  <TableHead className="font-semibold">Email / Login</TableHead>
                  <TableHead className="font-semibold">Staff Number</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right pr-6">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-slate-500 animate-pulse">Loading staff directory...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Users className="h-12 w-12 text-slate-300" />
                        <p className="text-slate-500 text-lg font-medium">No matching records found</p>
                        <p className="text-slate-400 text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className={`${selectedIds.includes(teacher.id) ? "bg-blue-50/50 dark:bg-blue-900/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"} transition-colors`}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(teacher.id)}
                          onCheckedChange={() => handleToggleSelect(teacher.id)}
                        />
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-white">{teacher.full_name}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{teacher.email || 'N/A'}</TableCell>
                      <TableCell>
                        <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold font-mono border border-blue-100 dark:border-blue-900/50">
                          {teacher.staff_number || 'PENDING'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${
                          teacher.employment_status === 'Active' 
                            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {teacher.employment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400 text-right pr-6 font-medium">
                        {new Date(teacher.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
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
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="CRITICAL ACTION REQUIRED"
        description={`You are about to initiate a PERMANENT DESTruction of ${selectedIds.length} teacher accounts. This process will purge all database profiles and cloud authentication records associated with these individuals. THIS OPERATION IS IRREVERSIBLE.`}
        confirmLabel="Destroy Accounts Permanently"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
