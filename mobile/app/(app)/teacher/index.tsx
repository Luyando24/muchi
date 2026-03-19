import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
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

  const fetchWithAuth = async (url: string) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const response = await fetch(url, {
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
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <View className="mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-bold text-primary mb-1">Teacher Portal</Text>
            <Text className="text-lg text-muted-foreground">
              Hello, {profile?.full_name || 'Teacher'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} className="bg-destructive/10 p-2 rounded-full">
            <User size={24} color="red" />
          </TouchableOpacity>
        </View>

        <View className="space-y-6">
          {/* Quick Stats */}
          <View className="flex-row gap-4 mb-2">
            <StatCard 
              label="Students" 
              value={stats?.totalStudents || 0} 
              icon={<GraduationCap size={20} color="#4f46e5" />} 
            />
            <StatCard 
              label="Attendance" 
              value={`${stats?.averageAttendance || 0}%`} 
              icon={<ClipboardList size={20} color="#10b981" />} 
            />
          </View>
          
          <View className="flex-row gap-4 mb-2">
            <StatCard 
              label="Classes Today" 
              value={stats?.classesToday || 0} 
              icon={<BookOpen size={20} color="#f59e0b" />} 
            />
            <StatCard 
              label="Ungraded" 
              value={stats?.pendingGrading || 0} 
              icon={<Search size={20} color="#ef4444" />} 
            />
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-3">
             <ActionIcon label="Attendance" icon={<ClipboardList size={22} color="#4f46e5" />} onPress={() => router.push('/(app)/teacher/mark-attendance')} />
             <ActionIcon label="Classes" icon={<BookOpen size={22} color="#10b981" />} onPress={() => router.push('/(app)/teacher/classes')} />
             <ActionIcon label="Assignments" icon={<Search size={22} color="#f59e0b" />} onPress={() => router.push('/(app)/teacher/assignments')} />
          </View>

          {/* Today's Schedule */}
          <Card>
            <CardHeader className="flex-row justify-between items-center pb-2">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <Text className="text-xs text-muted-foreground">{today}</Text>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <View className="space-y-3">
                  {todaySchedule.map((item, i) => (
                    <View key={i} className="flex-row items-center border-l-4 border-indigo-600 pl-3 py-1">
                      <Text className="text-xs font-bold w-14 text-muted-foreground">{item.start_time.substring(0, 5)}</Text>
                      <View className="flex-1">
                        <Text className="font-semibold text-sm">{item.subjects?.name || 'Class'}</Text>
                        <Text className="text-[10px] text-muted-foreground">{item.classes?.name}</Text>
                      </View>
                      <View className="bg-indigo-50 px-2 py-0.5 rounded">
                         <Text className="text-indigo-600 text-[10px] font-bold">{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-4 items-center">
                   <Text className="text-muted-foreground italic text-sm">No classes scheduled for today.</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Search Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Find Student</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    className="h-10 text-sm"
                  />
                </View>
                <Button 
                  title={isSearching ? "..." : "Search"} 
                  onPress={handleSearch}
                  className="w-20"
                />
              </View>

              {/* Results */}
              {searchResults.length > 0 && (
                <View className="mt-4 space-y-2">
                  <Text className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Results:</Text>
                  {searchResults.map((student) => (
                    <TouchableOpacity 
                      key={student.id}
                      className="flex-row justify-between items-center p-3 bg-indigo-50/50 rounded-lg border border-indigo-100"
                      onPress={() => router.push(`/(app)/teacher/${student.id}`)}
                    >
                      <View>
                        <Text className="font-medium text-sm">{student.full_name}</Text>
                        <Text className="text-[10px] text-muted-foreground">ID: {student.student_number}</Text>
                      </View>
                      <View className="bg-indigo-600 px-2 py-0.5 rounded">
                        <Text className="text-white text-[10px] font-bold">{student.grade}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>
        </View>
        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: any }) {
  return (
    <Card className="flex-1">
      <CardContent className="p-4 flex-row items-center gap-3">
        <View className="bg-muted/30 p-2 rounded-lg">{icon}</View>
        <View>
          <Text className="text-lg font-bold">{value}</Text>
          <Text className="text-[10px] text-muted-foreground">{label}</Text>
        </View>
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
