import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertCircle, ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
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
      if (data && data.length > 0) {
        setSelectedClassId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      if (classes.length === 0) setLoading(false);
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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Mark Attendance</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {classes.length > 0 ? (
          <>
            {classes.length > 1 && (
              <View className="mb-6">
                 <Text className="text-sm font-semibold text-muted-foreground mb-2">Select Class</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                   {classes.map(c => (
                     <TouchableOpacity 
                       key={c.id} 
                       onPress={() => setSelectedClassId(c.id)}
                       className={`px-4 py-2 rounded-full border ${selectedClassId === c.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-border'}`}
                     >
                       <Text className={selectedClassId === c.id ? 'text-white font-bold' : 'text-slate-600'}>{c.name}</Text>
                     </TouchableOpacity>
                   ))}
                 </ScrollView>
              </View>
            )}

            {loading ? (
              <ActivityIndicator size="small" color="#4f46e5" className="mt-10" />
            ) : (
              <View className="space-y-4">
                <View className="flex-row justify-between items-center bg-muted/20 p-3 rounded-lg border border-border">
                  <Text className="font-bold">{students.length} Students</Text>
                  <Text className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</Text>
                </View>

                {students.map((student) => (
                  <Card key={student.id} className="overflow-hidden">
                    <CardContent className="p-4 flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="font-semibold">{student.full_name}</Text>
                        <Text className="text-[10px] text-muted-foreground italic">{student.student_number}</Text>
                      </View>
                      
                      <View className="flex-row gap-2">
                        <StatusButton 
                          icon={<CheckCircle2 size={18} color={student.status === 'present' ? '#fff' : '#10b981'} />}
                          active={student.status === 'present'}
                          color="bg-green-500"
                          onPress={() => updateStatus(student.id, 'present')}
                        />
                        <StatusButton 
                          icon={<XCircle size={18} color={student.status === 'absent' ? '#fff' : '#ef4444'} />}
                          active={student.status === 'absent'}
                          color="bg-red-500"
                          onPress={() => updateStatus(student.id, 'absent')}
                        />
                        <StatusButton 
                          icon={<Clock size={18} color={student.status === 'late' ? '#fff' : '#f59e0b'} />}
                          active={student.status === 'late'}
                          color="bg-amber-500"
                          onPress={() => updateStatus(student.id, 'late')}
                        />
                        <StatusButton 
                          icon={<AlertCircle size={18} color={student.status === 'excused' ? '#fff' : '#64748b'} />}
                          active={student.status === 'excused'}
                          color="bg-slate-500"
                          onPress={() => updateStatus(student.id, 'excused')}
                        />
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : (
          <View className="items-center justify-center py-20">
            <ClipboardList size={48} color="#94a3b8" />
            <Text className="text-muted-foreground mt-4">You are not assigned as a class teacher.</Text>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>

      {students.length > 0 && (
        <View className="p-6 bg-white border-t border-border">
          <Button 
            title={saving ? "Saving..." : "Save Attendance"} 
            onPress={saveAttendance}
            disabled={saving}
          />
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
