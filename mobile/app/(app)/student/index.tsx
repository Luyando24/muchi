import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { BookOpen, Calendar, Clock, Bell } from 'lucide-react-native';

interface StudentProfile {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
  avatar_url?: string;
}

interface GradeSummary {
  subject_name: string;
  percentage: number;
  grade: string;
}

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  type: string;
  subject_name: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
}

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentGrades, setRecentGrades] = useState<GradeSummary[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary>({ present: 0, absent: 0, total: 0 });

  const fetchStudentData = async () => {
    try {
      if (!user) return;

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // 2. Fetch Recent Grades (Join with subjects)
      const { data: gradesData } = await supabase
        .from('student_grades')
        .select(`
          percentage,
          grade,
          subjects (name)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (gradesData) {
        setRecentGrades(gradesData.map((g: any) => ({
          subject_name: g.subjects?.name || 'Unknown',
          percentage: g.percentage,
          grade: g.grade
        })));
      }

      // 3. Fetch Upcoming Assignments (Join with subjects)
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', user.id)
        .single();

      if (enrollmentData?.class_id) {
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            type,
            subjects (name)
          `)
          .eq('class_id', enrollmentData.class_id)
          .gte('due_date', new Date().toISOString())
          .order('due_date', { ascending: true })
          .limit(3);

        if (assignmentsData) {
          setUpcomingAssignments(assignmentsData.map((a: any) => ({
            id: a.id,
            title: a.title,
            due_date: a.due_date,
            type: a.type,
            subject_name: a.subjects?.name || 'Unknown'
          })));
        }
      }

      // 4. Fetch Attendance Summary
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', user.id);

      if (attendanceData) {
        const present = attendanceData.filter(a => a.status === 'present').length;
        const absent = attendanceData.filter(a => a.status === 'absent').length;
        setAttendance({
          present,
          absent,
          total: attendanceData.length
        });
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentData();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const attendanceRate = attendance.total > 0 
    ? Math.round((attendance.present / attendance.total) * 100) 
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 p-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-primary mb-1">Student Portal</Text>
          <Text className="text-lg text-muted-foreground">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0]}
          </Text>
        </View>

        <View className="space-y-6">
          {/* Quick Stats Grid */}
          <View className="flex-row gap-4">
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <Calendar size={24} color="#4f46e5" className="mb-2" />
                <Text className="text-xl font-bold">{attendanceRate}%</Text>
                <Text className="text-[10px] text-muted-foreground">Attendance</Text>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <Clock size={24} color="#f59e0b" className="mb-2" />
                <Text className="text-xl font-bold">{upcomingAssignments.length}</Text>
                <Text className="text-[10px] text-muted-foreground">Pending Tasks</Text>
              </CardContent>
            </Card>
          </View>

          {/* Upcoming Assignments */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Upcoming Tasks</CardTitle>
              <Bell size={16} color="#4f46e5" />
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length > 0 ? (
                <View className="space-y-3">
                  {upcomingAssignments.map((assignment) => (
                    <View key={assignment.id} className="border-l-4 border-indigo-500 pl-3 py-1 bg-muted/10 rounded-r">
                      <Text className="font-semibold text-sm">{assignment.title}</Text>
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-[10px] text-muted-foreground">{assignment.subject_name}</Text>
                        <Text className="text-[10px] font-medium text-indigo-600">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-muted-foreground text-center py-4 text-xs italic">No pending assignments!</Text>
              )}
            </CardContent>
          </Card>

          {/* Recent Grades */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recent Scores</CardTitle>
              <BookOpen size={16} color="#10b981" />
            </CardHeader>
            <CardContent>
              {recentGrades.length > 0 ? (
                <View className="space-y-3">
                  {recentGrades.map((grade, index) => (
                    <View key={index} className="flex-row justify-between items-center border-b border-border pb-2 last:border-0">
                      <View>
                        <Text className="font-medium text-sm">{grade.subject_name}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-bold">{grade.percentage}%</Text>
                        <View className={`px-2 py-0.5 rounded ${
                          grade.grade.startsWith('A') ? 'bg-green-100' : 
                          grade.grade.startsWith('B') ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <Text className={`font-bold text-[10px] ${
                            grade.grade.startsWith('A') ? 'text-green-700' : 
                            grade.grade.startsWith('B') ? 'text-blue-700' : 'text-gray-700'
                          }`}>{grade.grade}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-muted-foreground text-center py-4 text-xs italic">No grades recorded yet.</Text>
              )}
            </CardContent>
          </Card>

          {/* Logout button */}
          <View className="mt-4">
            <Button
              title="Sign Out"
              onPress={signOut}
              variant="destructive"
            />
          </View>
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
