import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Bed, 
  Users, 
  Send,
  Check,
  X,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export default function AccommodationManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [currentAcademicYear, setCurrentAcademicYear] = useState(new Date().getFullYear().toString());
  
  // Dialog & Form States
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [newBlock, setNewBlock] = useState({ name: '', gender_policy: 'Mixed' });
  const [newRoom, setNewRoom] = useState({ block_id: '', room_number: '', capacity: '' });
  const [newAllocation, setNewAllocation] = useState({ student_id: '', room_id: '', academic_year: new Date().getFullYear().toString() });

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/accommodation/stats', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBlocksAndRooms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const [blockRes, roomRes] = await Promise.all([
        fetch('/api/school/accommodation/blocks', { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
        fetch('/api/school/accommodation/rooms', { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      ]);
      if (blockRes.ok) setBlocks(await blockRes.json());
      if (roomRes.ok) setRooms(await roomRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllocationsAndApps = async () => {
    setLoadingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const [allocRes, appRes, studentRes] = await Promise.all([
        fetch('/api/school/accommodation/allocations', { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
        fetch('/api/school/accommodation/applications', { headers: { 'Authorization': `Bearer ${session?.access_token}` } }),
        fetch('/api/school/accommodation/students', { headers: { 'Authorization': `Bearer ${session?.access_token}` } })
      ]);
      if (allocRes.ok) setAllocations(await allocRes.json());
      if (appRes.ok) setApplications(await appRes.json());
      if (studentRes.ok) setStudents(await studentRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/settings', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.academic_year) {
          const yearStr = data.academic_year.toString();
          setCurrentAcademicYear(yearStr);
          setNewAllocation(prev => ({ ...prev, academic_year: yearStr }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBlocksAndRooms();
    fetchAllocationsAndApps();
    fetchSettings();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.name) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/accommodation/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newBlock)
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Hostel block created successfully.' });
        setNewBlock({ name: '', gender_policy: 'Mixed' });
        fetchBlocksAndRooms();
        fetchStats();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create block');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Are you sure you want to delete this block? All associated rooms and allocations will be deleted.')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/accommodation/blocks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Block deleted.' });
        fetchBlocksAndRooms();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.block_id || !newRoom.room_number || !newRoom.capacity) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/accommodation/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newRoom)
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Room created successfully.' });
        setNewRoom({ block_id: '', room_number: '', capacity: '' });
        fetchBlocksAndRooms();
        fetchStats();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create room');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/accommodation/rooms/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Room deleted.' });
        fetchBlocksAndRooms();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllocation.student_id || !newAllocation.room_id || !newAllocation.academic_year) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/accommodation/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newAllocation)
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Student allocated to room successfully.' });
        setNewAllocation({ student_id: '', room_id: '', academic_year: currentAcademicYear });
        fetchAllocationsAndApps();
        fetchStats();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to allocate student');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVacateAllocation = async (id: string) => {
    if (!confirm('Are you sure you want to vacate this allocation?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/accommodation/allocations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Student has vacated the room.' });
        fetchAllocationsAndApps();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAppStatus = async (id: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/school/accommodation/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast({ title: 'Success', description: `Application ${status.toLowerCase()} successfully.` });
        fetchAllocationsAndApps();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifyShortage = async () => {
    if (!stats || stats.shortage <= 0) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/school/accommodation/notify-shortage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          totalBoarders: stats.totalBoarders,
          totalCapacity: stats.totalCapacity,
          shortage: stats.shortage
        })
      });
      if (res.ok) {
        toast({ title: 'Notification Sent', description: 'Ministry of Education portal has been notified of the critical shortage.' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStats && !stats) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get gender specific options based on school gender composition
  const isConfigured = !!stats?.boardingStatus && !!stats?.genderComposition;
  const allowedGenders: string[] = !stats?.genderComposition
    ? ['Male', 'Female', 'Mixed']
    : stats.genderComposition === 'Co-educational'
    ? ['Male', 'Female', 'Mixed']
    : [stats.genderComposition === 'Boys only' ? 'Male' : 'Female'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Hostel & Accommodation Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage blocks, rooms, student boarding allocations, and applications.</p>
        </div>
        <div className="flex gap-2">
          <Badge 
            variant="outline" 
            className={`font-bold text-xs uppercase px-3 py-1 ${
              !stats?.boardingStatus ? 'border-orange-300 text-orange-600 dark:text-orange-400 bg-orange-50' : ''
            }`}
          >
            Boarding status: {stats?.boardingStatus || 'Not Configured'}
          </Badge>
          <Badge 
            variant="outline" 
            className={`font-bold text-xs uppercase px-3 py-1 ${
              !stats?.genderComposition ? 'border-orange-300 text-orange-600 dark:text-orange-400 bg-orange-50' : ''
            }`}
          >
            Gender type: {stats?.genderComposition || 'Not Configured'}
          </Badge>
        </div>
      </div>

      {/* Not Configured Warning */}
      {!isConfigured && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/10 dark:border-orange-900/30">
          <CardContent className="p-4 flex items-center gap-3 text-orange-800 dark:text-orange-400">
            <HelpCircle className="h-6 w-6 shrink-0" />
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide">Boarding Settings Not Configured</h4>
              <p className="text-xs font-medium mt-0.5">
                Please go to <strong>Settings</strong> and configure the school's <strong>Boarding Status</strong> and <strong>Gender Composition</strong> to ensure accurate reporting and analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alert Banner for Shortages */}
      {stats?.shortage > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900/30">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-red-800 dark:text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <h4 className="font-black text-sm uppercase tracking-wide">Accommodation Shortage Detected</h4>
                <p className="text-xs font-medium mt-0.5">
                  Your school has {stats.totalBoarders} boarding students but only {stats.totalCapacity} available beds. Shortage: <span className="font-bold">{stats.shortage} beds</span>.
                </p>
              </div>
            </div>
            <Button 
              onClick={handleNotifyShortage} 
              disabled={submitting} 
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider py-1.5 px-4 h-9 shadow-lg shadow-red-500/10"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-2" />}
              Notify Ministry
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-slate-100 dark:bg-slate-900">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blocks">Blocks & Rooms</TabsTrigger>
          <TabsTrigger value="allocations">Student Allocations</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.filter(a => a.status === 'Pending').length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Boarding Students</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalBoarders}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{stats?.maleBoarders} M / {stats?.femaleBoarders} F</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600">
                  <Bed className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Bed Capacity</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.totalCapacity}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{stats?.maleCapacity} M / {stats?.femaleCapacity} F</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Occupied Beds</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats?.occupiedBeds}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{stats?.maleOccupied} M / {stats?.femaleOccupied} F</p>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              stats?.shortage > 0 
                ? "bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20" 
                : "bg-slate-50 dark:bg-slate-900/50"
            )}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  stats?.shortage > 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                )}>
                  {stats?.shortage > 0 ? <AlertTriangle className="h-6 w-6" /> : <Bed className="h-6 w-6" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Vacant Beds / Shortage</p>
                  <h3 className={cn(
                    "text-2xl font-bold",
                    stats?.shortage > 0 ? "text-red-600" : "text-slate-900 dark:text-white"
                  )}>
                    {stats?.shortage > 0 ? `-${stats.shortage}` : stats?.vacantBeds}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {stats?.shortage > 0 ? 'Accommodation Shortage' : `${stats?.vacantMale} M / ${stats?.vacantFemale} F`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Occupancy and capacity statistics per block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hostel Occupancy Rates</CardTitle>
                <CardDescription>Visual stats of capacity per block</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {blocks.map(b => {
                  const blockRooms = rooms.filter(r => r.block_id === b.id);
                  const capacity = blockRooms.reduce((acc, curr) => acc + curr.capacity, 0);
                  const blockRoomIds = blockRooms.map(r => r.id);
                  const occupied = allocations.filter(a => blockRoomIds.includes(a.room_id)).length;
                  const percent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
                  
                  return (
                    <div key={b.id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span>{b.name} ({b.gender_policy} Block)</span>
                        </div>
                        <span>{occupied} / {capacity} Beds ({percent}%)</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
                {blocks.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">No hostel blocks defined. Go to Blocks & Rooms to create one.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Boarding Demographic Breakdown</CardTitle>
                <CardDescription>Beds allocated and boarder registrations by gender</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Male statistics */}
                <div className="space-y-2 border-b pb-4">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Male Students</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Boarders</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.maleBoarders}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Bed Cap</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.maleCapacity}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Allocated</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.maleOccupied}</p>
                    </div>
                  </div>
                </div>

                {/* Female statistics */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Female Students</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Boarders</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.femaleBoarders}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Bed Cap</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.femaleCapacity}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                      <p className="text-[10px] uppercase font-black text-slate-400">Allocated</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.femaleOccupied}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BLOCKS & ROOMS TAB */}
        <TabsContent value="blocks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create block / room forms */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Add Hostel Block</CardTitle>
                  <CardDescription>Create a new block for housing students</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateBlock} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="blockName">Block Name / Hostel Code</Label>
                      <Input 
                        id="blockName" 
                        placeholder="e.g. Mandela Hall, Block A" 
                        value={newBlock.name}
                        onChange={e => setNewBlock({ ...newBlock, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="genderPolicy">Gender Policy</Label>
                      <Select 
                        value={newBlock.gender_policy}
                        onValueChange={val => setNewBlock({ ...newBlock, gender_policy: val })}
                      >
                        <SelectTrigger id="genderPolicy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedGenders.map(g => (
                            <SelectItem key={g} value={g}>{g} Students</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Add Hostel Block
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Add Room</CardTitle>
                  <CardDescription>Create a dormitory room in a block</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetBlock">Hostel Block</Label>
                      <Select 
                        value={newRoom.block_id}
                        onValueChange={val => setNewRoom({ ...newRoom, block_id: val })}
                      >
                        <SelectTrigger id="targetBlock">
                          <SelectValue placeholder="Select block" />
                        </SelectTrigger>
                        <SelectContent>
                          {blocks.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.gender_policy})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roomNum">Room Number / ID</Label>
                      <Input 
                        id="roomNum" 
                        placeholder="e.g. Room 101, Rm A-2" 
                        value={newRoom.room_number}
                        onChange={e => setNewRoom({ ...newRoom, room_number: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Bed Capacity</Label>
                      <Input 
                        id="capacity" 
                        type="number"
                        min="1"
                        placeholder="e.g. 4" 
                        value={newRoom.capacity}
                        onChange={e => setNewRoom({ ...newRoom, capacity: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      Create Room
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List of blocks & rooms */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold">Hostel Blocks & Rooms List</h3>
              
              {blocks.map(b => {
                const blockRooms = rooms.filter(r => r.block_id === b.id);
                const isExpanded = expandedBlockId === b.id;
                
                return (
                  <Card key={b.id} className="overflow-hidden">
                    <div 
                      className="p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-900 cursor-pointer"
                      onClick={() => setExpandedBlockId(isExpanded ? null : b.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                        <div>
                          <h4 className="font-bold text-sm">{b.name}</h4>
                          <div className="flex gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {b.gender_policy} policy
                            </Badge>
                            <span className="text-xs text-slate-500 font-medium">
                              {blockRooms.length} Rooms ({blockRooms.reduce((acc, curr) => acc + curr.capacity, 0)} Beds)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteBlock(b.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <CardContent className="p-4 border-t">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b text-xs text-slate-400 font-bold uppercase">
                              <th className="pb-2">Room Number</th>
                              <th className="pb-2 text-center">Beds Capacity</th>
                              <th className="pb-2 text-center">Allocated Beds</th>
                              <th className="pb-2 text-center">Status</th>
                              <th className="pb-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y text-sm">
                            {blockRooms.map(r => {
                              const occupiedCount = allocations.filter(a => a.room_id === r.id).length;
                              const isFull = occupiedCount >= r.capacity;
                              return (
                                <tr key={r.id}>
                                  <td className="py-3 font-semibold">{r.room_number}</td>
                                  <td className="py-3 text-center">{r.capacity}</td>
                                  <td className="py-3 text-center">{occupiedCount}</td>
                                  <td className="py-3 text-center">
                                    {isFull ? (
                                      <Badge variant="destructive" className="text-[10px]">Full</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-600">
                                        {r.capacity - occupiedCount} Vacant
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="py-3 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-rose-500" 
                                      onClick={() => handleDeleteRoom(r.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                            {blockRooms.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 italic">No rooms added to this block yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {blocks.length === 0 && (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed italic">
                  No hostel blocks created. Set up your hostel infrastructure using the panel on the left.
                </div>
              )}
            </div>

          </div>
        </TabsContent>

        {/* ALLOCATIONS TAB */}
        <TabsContent value="allocations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Allocation Form */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base font-bold">New Bed Allocation</CardTitle>
                <CardDescription>Assign a boarding student to a room</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAllocation} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentSelect">Boarding Student</Label>
                    <Select 
                      value={newAllocation.student_id}
                      onValueChange={val => setNewAllocation({ ...newAllocation, student_id: val })}
                    >
                      <SelectTrigger id="studentSelect">
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students
                          .filter(s => s.boarding_type === 'Boarder')
                          .map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name} ({s.gender}, Grade {s.grade || 'N/A'})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500">Only showing students configured as "Boarder" in their profiles.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roomSelect">Dormitory Room</Label>
                    <Select 
                      value={newAllocation.room_id}
                      onValueChange={val => setNewAllocation({ ...newAllocation, room_id: val })}
                    >
                      <SelectTrigger id="roomSelect">
                        <SelectValue placeholder="Select room..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms
                          .filter(r => {
                            const occupiedCount = allocations.filter(a => a.room_id === r.id).length;
                            return occupiedCount < r.capacity; // Only rooms with capacity
                          })
                          .map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.accommodation_blocks?.name} — {r.room_number} ({r.accommodation_blocks?.gender_policy} block)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input 
                      id="academicYear" 
                      value={newAllocation.academic_year}
                      onChange={e => setNewAllocation({ ...newAllocation, academic_year: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <PlusCircle className="h-4 w-4 mr-1" />}
                    Assign Room Allocation
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Allocations Table */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold">Active Room Assignments</h3>
              
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-400 font-bold uppercase">
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Hostel Block</th>
                        <th className="px-6 py-4 text-center">Room No.</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {allocations.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="px-6 py-4">
                            <p className="font-bold">{a.student?.full_name || 'Unknown student'}</p>
                            <p className="text-[10px] text-slate-500">Grade {a.student?.grade || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {a.student?.gender}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{a.room?.block?.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">{a.room?.block?.gender_policy} Block</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold">
                            {a.room?.room_number}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              className="text-rose-500 hover:text-rose-600 font-bold text-xs uppercase" 
                              onClick={() => handleVacateAllocation(a.id)}
                            >
                              Vacate
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {allocations.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 italic">No students allocated to beds yet. Use the assignment panel to assign student rooms.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* APPLICATIONS TAB */}
        <TabsContent value="applications">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-400 font-bold uppercase">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4">Pref. Block</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="px-6 py-4 font-bold">{app.student?.full_name}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] font-medium">{app.student?.gender}</Badge>
                      </td>
                      <td className="px-6 py-4 font-medium">{app.preferred_block?.name || 'Any'}</td>
                      <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-500">{app.notes || 'None'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <Badge className={cn(
                          "text-[10px]",
                          app.status === 'Pending' ? "bg-orange-100 text-orange-600 border-none" :
                          app.status === 'Approved' ? "bg-emerald-100 text-emerald-600 border-none" :
                          app.status === 'Rejected' ? "bg-red-100 text-red-600 border-none" :
                          "bg-slate-100 text-slate-600 border-none"
                        )}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {app.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 h-8 w-8 p-0" 
                              onClick={() => handleUpdateAppStatus(app.id, 'Approved')}
                            >
                              <Check className="h-4 w-4 text-white" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8 w-8 p-0" 
                              onClick={() => handleUpdateAppStatus(app.id, 'Rejected')}
                            >
                              <X className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {applications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">No boarding applications received yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
