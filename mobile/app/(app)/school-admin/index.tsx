import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Users, GraduationCap, School, BookOpen, LogOut } from 'lucide-react-native';
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
}

export default function SchoolAdminDashboard() {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
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
        .select('full_name, email')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData);

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
          <Card>
            <CardHeader>
              <CardTitle>Management</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="space-y-3">
                <Button 
                  title="Manage Students" 
                  variant="outline"
                  onPress={() => router.push('/(app)/school-admin/students')} 
                />
                <Button 
                  title="Manage Teachers" 
                  variant="outline"
                  onPress={() => router.push('/(app)/school-admin/teachers')} 
                />
                <Button 
                  title="Class Schedule" 
                  variant="outline"
                  onPress={() => {}} // TODO: Navigate to timetable
                />
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
