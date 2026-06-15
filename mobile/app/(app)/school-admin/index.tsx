import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Users, GraduationCap, School, BookOpen, LogOut, CreditCard, Building, Store, Utensils } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface DashboardStats {
  students: number;
  teachers: number;
  classes: number;
  subjects: number;
}

interface AdminProfile {
  full_name: string;
  email: string;
  school_id: string;
}

interface SchoolSettings {
  id: string;
  name: string;
  boarding_status?: string;
  enable_tuckshop?: boolean;
  academic_year?: string;
}

export default function SchoolAdminDashboard() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    teachers: 0,
    classes: 0,
    subjects: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      if (!user) return;

      // 1. Fetch Admin Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, school_id')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Fetch school details
        const { data: schoolData } = await supabase
          .from('schools')
          .select('id, name, boarding_status, enable_tuckshop, academic_year')
          .eq('id', profileData.school_id)
          .single();
        if (schoolData) {
          setSchool(schoolData);
        }
      }

      // 2. Fetch Stats (Parallel)
      const [
        { count: studentsCount },
        { count: teachersCount },
        { count: classesCount },
        { count: subjectsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        students: studentsCount || 0,
        teachers: teachersCount || 0,
        classes: classesCount || 0,
        subjects: subjectsCount || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 p-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-bold text-primary mb-1">Admin Portal</Text>
            <Text className="text-lg text-muted-foreground">
              Hello, {profile?.full_name || 'Admin'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} className="bg-destructive/10 p-2 rounded-full">
            <LogOut size={24} color="red" />
          </TouchableOpacity>
        </View>

        <View className="space-y-6">
          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-4">
            <Card className="w-[47%]">
              <CardContent className="items-center py-4">
                <GraduationCap size={32} color="#4f46e5" className="mb-2" />
                <Text className="text-3xl font-bold">{stats.students}</Text>
                <Text className="text-xs text-muted-foreground text-center">Total Students</Text>
              </CardContent>
            </Card>

            <Card className="w-[47%]">
              <CardContent className="items-center py-4">
                <Users size={32} color="#10b981" className="mb-2" />
                <Text className="text-3xl font-bold">{stats.teachers}</Text>
                <Text className="text-xs text-muted-foreground text-center">Total Teachers</Text>
              </CardContent>
            </Card>

            <Card className="w-[47%]">
              <CardContent className="items-center py-4">
                <School size={32} color="#f59e0b" className="mb-2" />
                <Text className="text-3xl font-bold">{stats.classes}</Text>
                <Text className="text-xs text-muted-foreground text-center">Active Classes</Text>
              </CardContent>
            </Card>

            <Card className="w-[47%]">
              <CardContent className="items-center py-4">
                <BookOpen size={32} color="#ec4899" className="mb-2" />
                <Text className="text-3xl font-bold">{stats.subjects}</Text>
                <Text className="text-xs text-muted-foreground text-center">Subjects</Text>
              </CardContent>
            </Card>
          </View>

          {/* Quick Actions */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-extrabold text-slate-800">Administrative Services</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <View className="flex-row flex-wrap gap-4 justify-between">
                <TouchableOpacity 
                  onPress={() => router.push('/(app)/school-admin/students')}
                  className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                >
                  <GraduationCap size={24} color="#4f46e5" className="mb-2" />
                  <Text className="font-extrabold text-slate-700 text-xs text-center">Manage Students</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/(app)/school-admin/teachers')}
                  className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                >
                  <Users size={24} color="#10b981" className="mb-2" />
                  <Text className="font-extrabold text-slate-700 text-xs text-center">Manage Teachers</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/(app)/school-admin/timetable')}
                  className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                >
                  <BookOpen size={24} color="#f59e0b" className="mb-2" />
                  <Text className="font-extrabold text-slate-700 text-xs text-center">Class Schedule</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.push('/school-admin/finance')}
                  className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                >
                  <CreditCard size={24} color="#4f46e5" className="mb-2" />
                  <Text className="font-extrabold text-slate-700 text-xs text-center">Finance & Fees</Text>
                </TouchableOpacity>

                {school?.boarding_status && school.boarding_status !== 'Day' && (
                  <TouchableOpacity 
                    onPress={() => router.push('/school-admin/accommodation')}
                    className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                  >
                    <Building size={24} color="#ec4899" className="mb-2" />
                    <Text className="font-extrabold text-slate-700 text-xs text-center">Accommodation</Text>
                  </TouchableOpacity>
                )}

                {school?.enable_tuckshop && (
                  <TouchableOpacity 
                    onPress={() => router.push('/school-admin/tuckshop')}
                    className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                  >
                    <Store size={24} color="#10b981" className="mb-2" />
                    <Text className="font-extrabold text-slate-700 text-xs text-center">Tuckshop POS</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  onPress={() => router.push('/school-admin/feeding-program')}
                  className="w-[47%] bg-slate-50 border border-slate-100 rounded-2xl p-4 items-center"
                >
                  <Utensils size={24} color="#ef4444" className="mb-2" />
                  <Text className="font-extrabold text-slate-700 text-xs text-center">Feeding Program</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>

          {/* Recent Activity Mock */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-3 h-3 rounded-full bg-green-500" />
                <Text className="text-sm font-medium">Database Connected</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-3 h-3 rounded-full bg-green-500" />
                <Text className="text-sm font-medium">Sync Service Active</Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
