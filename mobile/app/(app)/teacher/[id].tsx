import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ArrowLeft, User, GraduationCap, Calendar, BookOpen } from 'lucide-react-native';

interface StudentProfile {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
}

interface GradeRecord {
  subject_name: string;
  percentage: number;
  grade: string;
  term: string;
}

export default function StudentDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchStudentData();
  }, [id]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, student_number, grade')
        .eq('id', id)
        .single();
      
      if (profileData) setProfile(profileData);

      // 2. Fetch Grades
      const { data: gradesData } = await supabase
        .from('student_grades')
        .select('percentage, grade, term, subjects(name)')
        .eq('student_id', id);
      
      if (gradesData) {
        setGrades(gradesData.map((g: any) => ({
          subject_name: g.subjects?.name || 'Unknown',
          percentage: g.percentage,
          grade: g.grade,
          term: g.term
        })));
      }

      // 3. Fetch Attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', id);
      
      if (attendanceData) {
        setAttendance({
          present: attendanceData.filter(a => a.status === 'present').length,
          absent: attendanceData.filter(a => a.status === 'absent').length
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
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
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Student Details</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Header Profile */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
            <User size={48} color="#4f46e5" />
          </View>
          <Text className="text-2xl font-bold">{profile?.full_name}</Text>
          <Text className="text-muted-foreground italic">ID: {profile?.student_number}</Text>
          <View className="mt-2 bg-primary/10 px-3 py-1 rounded-full">
            <Text className="text-primary font-bold text-sm">{profile?.grade}</Text>
          </View>
        </View>

        <View className="space-y-6">
          {/* Quick Stats */}
          <View className="flex-row gap-4">
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <Calendar size={28} color="#4f46e5" className="mb-2" />
                <Text className="text-xl font-bold">{attendance.present}</Text>
                <Text className="text-[10px] text-muted-foreground text-center">Days Present</Text>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <GraduationCap size={28} color="#10b981" className="mb-2" />
                <Text className="text-xl font-bold">{grades.length}</Text>
                <Text className="text-[10px] text-muted-foreground text-center">Grades Recorded</Text>
              </CardContent>
            </Card>
          </View>

          {/* Academic Performance */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <View className="flex-row items-center gap-2">
                <BookOpen size={18} color="#4f46e5" />
                <CardTitle className="text-base">Academic Performance</CardTitle>
              </View>
            </CardHeader>
            <CardContent>
              {grades.length > 0 ? (
                <View className="space-y-4">
                  <View className="flex-row bg-muted/30 p-2 rounded-lg border border-border">
                    <Text className="flex-1 text-[10px] font-bold text-muted-foreground uppercase">Subject</Text>
                    <Text className="w-12 text-center text-[10px] font-bold text-muted-foreground uppercase">Score</Text>
                    <Text className="w-12 text-center text-[10px] font-bold text-muted-foreground uppercase">Grade</Text>
                  </View>
                  {grades.map((grade, idx) => (
                    <View key={idx} className="flex-row items-center px-2 py-1 border-b border-border/50 last:border-0">
                      <View className="flex-1">
                        <Text className="font-semibold text-sm">{grade.subject_name}</Text>
                        <Text className="text-[10px] text-muted-foreground italic">{grade.term}</Text>
                      </View>
                      <Text className="w-12 text-center font-bold text-sm">{grade.percentage}%</Text>
                      <View className="w-12 items-center">
                        <View className={`px-2 py-0.5 rounded ${parseFloat(grade.grade) >= 80 ? 'bg-green-100' : parseFloat(grade.grade) >= 60 ? 'bg-indigo-100' : 'bg-red-100'}`}>
                           <Text className={`text-[10px] font-bold ${parseFloat(grade.grade) >= 80 ? 'text-green-700' : parseFloat(grade.grade) >= 60 ? 'text-indigo-700' : 'text-red-700'}`}>{grade.grade}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="py-8 items-center">
                   <Text className="text-muted-foreground text-center py-4 text-xs italic">No academic data available.</Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Attendance History Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="space-y-4">
                <View className="flex-row items-end gap-2">
                   <Text className="text-3xl font-bold text-indigo-600">
                     {Math.round((attendance.present / (attendance.present + attendance.absent || 1)) * 100)}%
                   </Text>
                   <Text className="text-xs text-muted-foreground mb-1.5">Overall Attendance</Text>
                </View>

                <View className="space-y-3">
                  <View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-[10px] font-bold text-muted-foreground uppercase">Present ({attendance.present})</Text>
                      <Text className="text-[10px] font-bold text-green-600">{Math.round((attendance.present / (attendance.present + attendance.absent || 1)) * 100)}%</Text>
                    </View>
                    <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <View 
                        className="bg-green-500 h-full rounded-full" 
                        style={{ width: `${(attendance.present / (attendance.present + attendance.absent || 1)) * 100}%` }} 
                      />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-[10px] font-bold text-muted-foreground uppercase">Absent ({attendance.absent})</Text>
                      <Text className="text-[10px] font-bold text-red-600">{Math.round((attendance.absent / (attendance.present + attendance.absent || 1)) * 100)}%</Text>
                    </View>
                    <View className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <View 
                        className="bg-red-500 h-full rounded-full" 
                        style={{ width: `${(attendance.absent / (attendance.present + attendance.absent || 1)) * 100}%` }} 
                      />
                    </View>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}
