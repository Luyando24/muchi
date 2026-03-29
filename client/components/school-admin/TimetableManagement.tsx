
import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  room: string | null;
  classes?: { name: string };
  subjects?: { name: string; code: string };
  teacher?: { full_name: string };
}

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  fullName: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

export default function TimetableManagement() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:00',
    class_id: '',
    subject_id: '',
    teacher_id: 'null', // 'null' string for select value
    room: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchTimetable();
    }
  }, [selectedClassId]);

  const fetchInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      // Fetch school settings first for defaults
      const settingsRes = await fetch('/api/school/settings', { headers });
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setSelectedTerm(settings.current_term || 'Term 1');
        setSelectedYear(settings.academic_year || new Date().getFullYear().toString());
      }

      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        fetch('/api/school/classes?limit=500', { headers }),
        fetch('/api/school/subjects', { headers }),
        fetch('/api/school/teachers?limit=500', { headers })
      ]);

      if (classesRes.ok) {
        const d = await classesRes.json();
        setClasses(d?.data || d);
      }
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (teachersRes.ok) {
        const d = await teachersRes.json();
        setTeachers(d?.data || d);
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTimetable = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let url = '/api/school/timetables';
      const params = new URLSearchParams();
      if (selectedClassId && selectedClassId !== 'all') params.append('class_id', selectedClassId);
      if (selectedYear) params.append('academic_year', selectedYear);
      if (selectedTerm) params.append('term', selectedTerm);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch timetable');

      const data = await response.json();
      setEntries(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = isEditing ? `/api/school/timetables/${formData.id}` : '/api/school/timetables';
      const method = isEditing ? 'PUT' : 'POST';

      // Prepare payload (convert 'null' string to actual null)
      const payload = {
        ...formData,
        teacher_id: formData.teacher_id === 'null' ? null : formData.teacher_id,
        academic_year: selectedYear,
        term: selectedTerm
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save timetable entry');

      toast({ title: "Success", description: `Timetable entry ${isEditing ? 'updated' : 'created'} successfully` });
      setIsDialogOpen(false);
      fetchTimetable();
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/school/timetables/${deleteTargetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Failed to delete entry');

      toast({ title: "Success", description: "Entry deleted successfully" });
      setDeleteTargetId(null);
      fetchTimetable();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      day_of_week: 'Monday',
      start_time: '08:00',
      end_time: '09:00',
      class_id: selectedClassId !== 'all' ? selectedClassId : '',
      subject_id: '',
      teacher_id: 'null',
      room: ''
    });
    setIsEditing(false);
  };

  const openEditDialog = (entry: TimetableEntry) => {
    setFormData({
      id: entry.id,
      day_of_week: entry.day_of_week,
      start_time: entry.start_time.substring(0, 5),
      end_time: entry.end_time.substring(0, 5),
      class_id: entry.class_id,
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id || 'null',
      room: entry.room || ''
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  // Helper to get entry for a specific slot
  const getEntry = (day: string, time: string) => {
    return entries.find(e =>
      e.day_of_week === day &&
      e.start_time.substring(0, 5) === time
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Timetable Management</CardTitle>
              <CardDescription>Manage class schedules and teacher assignments.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes (List View)</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" /> Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit' : 'Add'} Timetable Entry</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Day</Label>
                        <Select value={formData.day_of_week} onValueChange={v => setFormData({ ...formData, day_of_week: v })}>
                          <SelectTrigger className="text-black dark:text-white">
                            <SelectValue className="text-black dark:text-white" />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Select value={formData.start_time} onValueChange={v => setFormData({ ...formData, start_time: v })}>
                          <SelectTrigger className="text-black dark:text-white">
                            <SelectValue className="text-black dark:text-white" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={formData.class_id} onValueChange={v => setFormData({ ...formData, class_id: v })}>
                        <SelectTrigger className="text-black dark:text-white">
                          <SelectValue className="text-black dark:text-white" placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={formData.subject_id} onValueChange={v => setFormData({ ...formData, subject_id: v })}>
                        <SelectTrigger className="text-black dark:text-white">
                          <SelectValue className="text-black dark:text-white" placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Teacher (Optional)</Label>
                      <Select value={formData.teacher_id} onValueChange={v => setFormData({ ...formData, teacher_id: v })}>
                        <SelectTrigger className="text-black dark:text-white">
                          <SelectValue className="text-black dark:text-white" placeholder="Select Teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="null">No Teacher Assigned</SelectItem>
                          {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Room (Optional)</Label>
                      <Input
                        placeholder="e.g. Room 101"
                        value={formData.room}
                        onChange={e => setFormData({ ...formData, room: e.target.value })}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : selectedClassId === 'all' ? (
            // List View
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day & Time</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">{entry.day_of_week}</div>
                      <div className="text-sm text-slate-500">{entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}</div>
                    </TableCell>
                    <TableCell>{entry.classes?.name}</TableCell>
                    <TableCell>{entry.subjects?.name}</TableCell>
                    <TableCell>{entry.teacher?.full_name || 'Unassigned'}</TableCell>
                    <TableCell>{entry.room || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteTargetId(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No timetable entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            // Grid View
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Time</TableHead>
                    {DAYS.map(day => (
                      <TableHead key={day} className="min-w-[150px]">{day}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TIMES.map(time => (
                    <TableRow key={time}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-500" />
                          {time}
                        </div>
                      </TableCell>
                      {DAYS.map(day => {
                        const entry = getEntry(day, time);
                        return (
                          <TableCell key={`${day}-${time}`} className="p-2">
                            {entry ? (
                              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 group relative hover:shadow-sm transition-shadow">
                                <div className="font-semibold text-sm">{entry.subjects?.name}</div>
                                <div className="text-xs text-slate-500">{entry.teacher?.full_name}</div>
                                {entry.room && <div className="text-xs text-slate-400 mt-1">{entry.room}</div>}

                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-slate-900 rounded shadow-sm p-0.5">
                                  <button onClick={() => openEditDialog(entry)} className="p-1 hover:text-blue-600">
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setDeleteTargetId(entry.id)} className="p-1 hover:text-red-600">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="h-full min-h-[60px] rounded-md border border-dashed border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100"
                                onClick={() => {
                                  resetForm();
                                  setFormData(prev => ({
                                    ...prev,
                                    day_of_week: day,
                                    start_time: time,
                                    class_id: selectedClassId
                                  }));
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Timetable Entry?"
        description="Are you sure you want to delete this timetable entry? This action cannot be undone."
        confirmLabel="Delete Entry"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
