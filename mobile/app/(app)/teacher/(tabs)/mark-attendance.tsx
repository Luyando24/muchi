import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, ClipboardList } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface ClassInfo {
  id: string;
  name: string;
}

interface StudentAttendance {
  id: string;
  full_name: string;
  student_number: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export default function MarkAttendance() {
  const { user } = useAuth();
  const router = useRouter();
  const { classId } = useLocalSearchParams();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classId as string || null);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch classes for this teacher
  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_teacher_id', user?.id);
      
      if (error) throw error;
      setClasses(data || []);
      
      // If no classId from params and we have classes, pick the first one
      if (!selectedClassId && data && data.length > 0) {
        setSelectedClassId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      if (!selectedClassId && classes.length === 0) setLoading(false);
    }
  };

  // Fetch students for selected class
  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId);
  }, [selectedClassId]);

  const fetchStudents = async (classId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          profiles (
            id,
            full_name,
            student_number
          )
        `)
        .eq('class_id', classId);
      
      if (error) throw error;
      
      setStudents((data || []).map((e: any) => ({
        id: e.profiles.id,
        full_name: e.profiles.full_name,
        student_number: e.profiles.student_number,
        status: 'present' // Default
      })));
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (id: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const saveAttendance = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Need school_id
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();
      
      const records = students.map(s => ({
        school_id: profile?.school_id,
        student_id: s.id,
        class_id: selectedClassId,
        date: today,
        status: s.status,
        recorded_by: user?.id
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,date' });

      if (error) throw error;
      
      Alert.alert('Success', 'Attendance saved successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !selectedClassId) {
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
        <Text className="text-xl font-extrabold text-slate-900">Mark Attendance</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {classes.length > 0 ? (
          <>
            {classes.length > 1 && (
              <View className="mb-6">
                 <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Select Class</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                   {classes.map(c => (
                     <TouchableOpacity 
                       key={c.id} 
                       onPress={() => setSelectedClassId(c.id)}
                       className={`px-5 py-2.5 rounded-2xl border ${selectedClassId === c.id ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}
                     >
                       <Text className={`text-xs font-bold ${selectedClassId === c.id ? 'text-white' : 'text-slate-600'}`}>{c.name}</Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
              </View>
            )}

            {loading ? (
              <View className="py-20">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : (
              <View className="space-y-4">
                <View className="flex-row justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <View className="flex-row items-center gap-2">
                     <View className="bg-indigo-50 p-2 rounded-lg">
                        <Users size={16} color="#4f46e5" />
                     </View>
                     <Text className="font-extrabold text-slate-800">{students.length} Students</Text>
                  </View>
                  <Text className="text-[10px] font-black text-slate-400 uppercase">{new Date().toLocaleDateString()}</Text>
                </View>

                {students.map((student) => (
                  <Card key={student.id} className="bg-white border-slate-100 shadow-sm overflow-hidden">
                    <CardContent className="p-4 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-extrabold text-slate-800">{student.full_name}</Text>
                        <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{student.student_number}</Text>
                      </View>
                      
                      <View className="flex-row gap-2.5">
                        <StatusButton 
                          icon={<CheckCircle2 size={16} color={student.status === 'present' ? '#fff' : '#10b981'} />}
                          active={student.status === 'present'}
                          color="bg-emerald-500"
                          onPress={() => updateStatus(student.id, 'present')}
                        />
                        <StatusButton 
                          icon={<XCircle size={16} color={student.status === 'absent' ? '#fff' : '#ef4444'} />}
                          active={student.status === 'absent'}
                          color="bg-rose-500"
                          onPress={() => updateStatus(student.id, 'absent')}
                        />
                        <StatusButton 
                          icon={<Clock size={16} color={student.status === 'late' ? '#fff' : '#f59e0b'} />}
                          active={student.status === 'late'}
                          color="bg-amber-500"
                          onPress={() => updateStatus(student.id, 'late')}
                        />
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : (
          <View className="items-center justify-center py-20 bg-white rounded-3xl border border-slate-100">
            <ClipboardList size={48} color="#cbd5e1" />
            <Text className="text-slate-400 font-bold mt-4">No Assigned classes</Text>
          </View>
        )}
        <View className="h-24" />
      </ScrollView>

      {students.length > 0 && (
        <View className="p-6 bg-white border-t border-slate-100 shadow-lg">
          <TouchableOpacity 
            onPress={saveAttendance}
            disabled={saving}
            className={`h-14 rounded-2xl flex-row items-center justify-center gap-3 shadow-md ${saving ? 'bg-slate-200' : 'bg-indigo-600'}`}
          >
             {saving ? (
                <ActivityIndicator color="white" />
             ) : (
                <>
                  <CheckCircle2 size={20} color="white" />
                  <Text className="text-white font-black uppercase tracking-widest">Save Attendance</Text>
                </>
             )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function StatusButton({ icon, active, color, onPress }: { icon: any, active: boolean, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className={`w-10 h-10 rounded-full items-center justify-center border ${active ? color + ' border-transparent' : 'bg-white border-slate-200'}`}
    >
      {icon}
    </TouchableOpacity>
  );
}
