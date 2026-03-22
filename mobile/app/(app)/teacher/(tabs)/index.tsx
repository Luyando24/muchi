import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Search, User, BookOpen, GraduationCap, ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface TeacherProfile {
  full_name: string;
  email: string;
}

interface StudentResult {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
}

interface DashboardStats {
  totalStudents: number;
  classesToday: number;
  pendingGrading: number;
  averageAttendance: number;
}

interface TimetableEntry {
  day_of_week: string;
  start_time: string;
  end_time: string;
  classes?: { name: string };
  subjects?: { name: string; code: string };
}

export default function TeacherDashboard() {
  const { signOut, user, session } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTeacherProfile();
      fetchDashboardData();
    }
  }, [user]);

  const fetchWithAuth = async (endpoint: string) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  const fetchTeacherProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, timetableData] = await Promise.all([
        fetchWithAuth('/api/teacher/dashboard-stats'),
        fetchWithAuth('/api/teacher/timetable')
      ]);

      setStats(statsData);
      setTimetable(timetableData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_number, grade')
        .eq('role', 'student')
        .or(`full_name.ilike.%${searchQuery}%,student_number.eq.${searchQuery}`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaySchedule = timetable?.filter(t => t.day_of_week === today) || [];

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Top Navbar mimic */}
        <View className="flex-row justify-between items-center mb-8">
           <TouchableOpacity className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
             <Search size={20} color="#64748b" />
           </TouchableOpacity>
           <View className="flex-row items-center gap-3">
             <TouchableOpacity className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
               <ClipboardList size={20} color="#64748b" />
             </TouchableOpacity>
             <View className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                <View className="flex-1 items-center justify-center bg-indigo-100">
                  <User size={24} color="#4f46e5" />
                </View>
             </View>
           </View>
        </View>

        {/* Hero Section */}
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-slate-900">Good Morning, {profile?.full_name || 'Teacher'}!</Text>
          <Text className="text-sm text-slate-500 mt-1">Here's what's happening in your classes today.</Text>
        </View>

        {/* Primary Action */}
        <TouchableOpacity 
          className="bg-indigo-600 p-4 rounded-xl flex-row items-center justify-center gap-2 mb-8 shadow-md"
          onPress={() => router.push('/(app)/teacher/mark-attendance')}
        >
          <ClipboardList size={20} color="white" />
          <Text className="text-white font-bold text-base">Mark Attendance</Text>
        </TouchableOpacity>

        <View className="space-y-4 mb-8">
          {/* Quick Stats Grid */}
          <View className="flex-row gap-4">
            <StatCard 
              label="Total Students" 
              value={stats?.totalStudents || 0} 
              icon={<GraduationCap size={22} color="#4f46e5" />} 
            />
            <StatCard 
              label="Classes Today" 
              value={stats?.classesToday || 0} 
              icon={<BookOpen size={22} color="#10b981" />} 
            />
          </View>
          
          <View className="flex-row gap-4">
            <StatCard 
              label="Pending Grading" 
              value={stats?.pendingGrading || 0} 
              icon={<Search size={22} color="#f59e0b" />} 
            />
            <StatCard 
              label="Avg. Attendance" 
              value={`${stats?.averageAttendance || 0}%`} 
              icon={<ClipboardList size={22} color="#4f46e5" />} 
            />
          </View>
        </View>

        {/* My Classes Section - Mobile Web Style */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <BookOpen size={20} color="#4f46e5" />
              <Text className="text-lg font-extrabold text-slate-900">My Classes</Text>
            </View>
          </View>
          
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardContent className="p-4">
               {timetable.length > 0 ? (
                 <View>
                   <Text className="text-xs text-slate-500 mb-4">You have {timetable.length} classes assigned</Text>
                   {timetable.slice(0, 1).map((cls, i) => (
                      <TouchableOpacity 
                        key={i} 
                        onPress={() => router.push('/(app)/teacher/classes')}
                        className="bg-slate-50 p-4 rounded-xl flex-row justify-between items-center border border-slate-100"
                      >
                        <View>
                           <Text className="font-bold text-slate-900 text-base">{cls.classes?.name || 'Class'}</Text>
                           <View className="flex-row items-center gap-1 mt-1">
                              <User size={12} color="#64748b" />
                              <Text className="text-[10px] text-slate-500">0 Students enrolled</Text>
                           </View>
                        </View>
                        <View className="w-8 h-1 bg-slate-200 rounded-full" />
                      </TouchableOpacity>
                   ))}
                   
                   <TouchableOpacity 
                     className="mt-4 items-center flex-row justify-center gap-1"
                     onPress={() => router.push('/(app)/teacher/classes')}
                   >
                     <Text className="text-indigo-600 font-bold text-sm">View All Classes</Text>
                     <Text className="text-indigo-600 font-bold text-lg">›</Text>
                   </TouchableOpacity>
                 </View>
               ) : (
                 <Text className="text-slate-500 italic text-center py-4">No classes assigned yet.</Text>
               )}
            </CardContent>
          </Card>
        </View>

        {/* Recent Activity Section */}
        <View className="mb-8">
           <View className="flex-row items-center gap-2 mb-4">
              <Search size={20} color="#4f46e5" />
              <Text className="text-lg font-extrabold text-slate-900">Recent Activity</Text>
           </View>
           <Card className="bg-white border-slate-100 shadow-sm min-h-[150px] justify-center items-center">
              <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-3">
                 <ClipboardList size={24} color="#cbd5e1" />
              </View>
              <Text className="text-xs text-slate-400">No recent activity to show.</Text>
           </Card>
        </View>

        {/* School Announcements */}
        <View className="mb-12">
           <View className="flex-row items-center gap-2 mb-4">
              <BookOpen size={20} color="#4f46e5" />
              <Text className="text-lg font-extrabold text-slate-900">School Announcements</Text>
           </View>
           <Card className="bg-white border-slate-100 shadow-sm p-4">
              <View className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                 <Text className="font-bold text-indigo-900 text-sm mb-1">Welcome back to the new term!</Text>
                 <Text className="text-[10px] text-indigo-700">Please ensure all grades are submitted by Friday.</Text>
              </View>
           </Card>
        </View>

        <TouchableOpacity 
          onPress={signOut}
          className="mb-20 items-center"
        >
          <Text className="text-destructive font-bold text-sm">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: any }) {
  return (
    <Card className="flex-1 bg-white border-slate-100 shadow-sm">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-start mb-2">
           <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</Text>
           <View className="opacity-80">{icon}</View>
        </View>
        <Text className="text-2xl font-black text-slate-900">{value}</Text>
      </CardContent>
    </Card>
  );
}

function ActionIcon({ label, icon, onPress }: { label: string, icon: any, onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1 bg-white p-3 rounded-2xl items-center justify-center border border-slate-100 shadow-sm">
      <View className="mb-1">{icon}</View>
      <Text className="text-[10px] font-bold text-slate-700">{label}</Text>
    </TouchableOpacity>
  );
}
