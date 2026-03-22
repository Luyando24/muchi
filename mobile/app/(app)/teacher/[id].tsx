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
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Student Profile</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {/* Header Profile */}
        <View className="items-center mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <View className="w-24 h-24 bg-indigo-50 rounded-full items-center justify-center mb-4 border-4 border-white shadow-md">
            <User size={48} color="#4f46e5" />
          </View>
          <Text className="text-2xl font-black text-slate-900">{profile?.full_name}</Text>
          <View className="flex-row items-center gap-1.5 mt-1">
             <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider">ID: {profile?.student_number}</Text>
          </View>
          <View className="mt-4 bg-indigo-600 px-4 py-1.5 rounded-full shadow-sm">
            <Text className="text-white font-black text-xs uppercase tracking-widest">{profile?.grade}</Text>
          </View>
        </View>

        <View className="space-y-6">
          {/* Quick Stats Grid */}
          <View className="flex-row gap-4">
            <Card className="flex-1 bg-white border-slate-100 shadow-sm">
              <CardContent className="items-center py-5">
                <View className="bg-indigo-50 p-3 rounded-2xl mb-3">
                   <Calendar size={24} color="#4f46e5" />
                </View>
                <Text className="text-2xl font-black text-slate-900">{attendance.present}</Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Days Present</Text>
              </CardContent>
            </Card>
            <Card className="flex-1 bg-white border-slate-100 shadow-sm">
              <CardContent className="items-center py-5">
                <View className="bg-emerald-50 p-3 rounded-2xl mb-3">
                   <GraduationCap size={24} color="#10b981" />
                </View>
                <Text className="text-2xl font-black text-slate-900">{grades.length}</Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Grades Recorded</Text>
              </CardContent>
            </Card>
          </View>

          {/* Academic Performance */}
          <View>
            <View className="flex-row items-center gap-2 mb-4">
               <BookOpen size={20} color="#4f46e5" />
               <Text className="text-lg font-extrabold text-slate-900">Academic Performance</Text>
            </View>
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4">
                {grades.length > 0 ? (
                  <View className="space-y-4">
                    <View className="flex-row bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <Text className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">Subject</Text>
                      <Text className="w-12 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">Score</Text>
                      <Text className="w-12 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">Grade</Text>
                    </View>
                    {grades.map((grade, idx) => (
                      <View key={idx} className="flex-row items-center px-2 py-1.5 border-b border-slate-50 last:border-0">
                        <View className="flex-1">
                          <Text className="font-extrabold text-slate-800 text-sm">{grade.subject_name}</Text>
                          <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{grade.term}</Text>
                        </View>
                        <Text className="w-12 text-center font-black text-slate-900 text-sm">{grade.percentage}%</Text>
                        <View className="w-12 items-center">
                          <View className={`px-2 py-0.5 rounded ${parseFloat(grade.grade) >= 80 ? 'bg-emerald-50' : parseFloat(grade.grade) >= 60 ? 'bg-indigo-50' : 'bg-rose-50'}`}>
                             <Text className={`text-[10px] font-black ${parseFloat(grade.grade) >= 80 ? 'text-emerald-700' : parseFloat(grade.grade) >= 60 ? 'text-indigo-700' : 'text-rose-700'}`}>{grade.grade}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View className="py-8 items-center">
                     <Text className="text-slate-400 text-center py-4 text-xs italic">No academic data available.</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

          {/* Attendance History Summary */}
          <View className="mb-8">
            <View className="flex-row items-center gap-2 mb-4">
               <Calendar size={20} color="#4f46e5" />
               <Text className="text-lg font-extrabold text-slate-900">Attendance Summary</Text>
            </View>
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <View className="space-y-6">
                  <View className="flex-row items-end gap-2">
                     <Text className="text-4xl font-black text-indigo-600">
                       {Math.round((attendance.present / (attendance.present + attendance.absent || 1)) * 100)}%
                     </Text>
                     <Text className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Attendance</Text>
                  </View>
 
                  <View className="space-y-4">
                    <View>
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Present ({attendance.present})</Text>
                        <Text className="text-[9px] font-black text-indigo-600">{Math.round((attendance.present / (attendance.present + attendance.absent || 1)) * 100)}%</Text>
                      </View>
                      <View className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                        <View 
                          className="bg-indigo-500 h-full rounded-full shadow-sm" 
                          style={{ width: `${(attendance.present / (attendance.present + attendance.absent || 1)) * 100}%` }} 
                        />
                      </View>
                    </View>
 
                    <View>
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Absent ({attendance.absent})</Text>
                        <Text className="text-[9px] font-black text-rose-500">{Math.round((attendance.absent / (attendance.present + attendance.absent || 1)) * 100)}%</Text>
                      </View>
                      <View className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                        <View 
                          className="bg-rose-500 h-full rounded-full shadow-sm" 
                          style={{ width: `${(attendance.absent / (attendance.present + attendance.absent || 1)) * 100}%` }} 
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </CardContent>
            </Card>
          </View>
        </View>
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
