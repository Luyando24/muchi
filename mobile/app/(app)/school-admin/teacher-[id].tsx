import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ArrowLeft, User, BookOpen, Briefcase, Award, ChevronRight } from 'lucide-react-native';

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  address?: string;
  highest_qualification?: string;
  institution_name?: string;
  field_of_study?: string;
  completion_year?: number;
}

interface AssignedClassSubject {
  id: string;
  className: string;
  subjectName: string;
  subjectCode: string;
}

export default function TeacherDetailsAdmin() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [assignments, setAssignments] = useState<AssignedClassSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileErr) throw profileErr;
      setProfile(profileData);

      // 2. Fetch Assignments (ClassSubjects)
      const { data: classSubjectsData } = await supabase
        .from('class_subjects')
        .select(`
          id,
          classes (name),
          subjects (name, code)
        `)
        .eq('teacher_id', id);

      if (classSubjectsData) {
        setAssignments(classSubjectsData.map((cs: any) => ({
          id: cs.id,
          className: cs.classes?.name || 'Unknown Class',
          subjectName: cs.subjects?.name || 'Unknown Subject',
          subjectCode: cs.subjects?.code || 'SUBJ'
        })));
      }

    } catch (error: any) {
      console.error('Error fetching teacher details:', error);
      Alert.alert('Error', 'Failed to load teacher details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTeacherData();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Teacher Profile Detail</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="space-y-6 mb-20">

          {/* User main card */}
          <Card className="bg-white border-slate-100 shadow-sm items-center py-6">
            <CardContent className="items-center w-full">
              <View className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-slate-50 items-center justify-center mb-3">
                <Briefcase size={36} color="#10b981" />
              </View>
              <Text className="font-extrabold text-slate-950 text-lg">{profile?.full_name}</Text>
              <Text className="text-xs text-slate-400 font-bold uppercase mt-0.5">{profile?.email}</Text>
              
              <View className="bg-emerald-600 px-3.5 py-1 rounded-full mt-3">
                <Text className="text-white text-[9px] font-black uppercase tracking-widest">
                  {profile?.role.replace('_', ' ')}
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Teacher demographics */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-2 mb-2">
              <CardTitle className="text-xs font-extrabold text-slate-400 uppercase">Information Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.phone_number || 'N/A'}</Text>
              </View>
              <View className="h-px bg-slate-50" />
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Residential Address</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.address || 'N/A'}</Text>
              </View>
            </CardContent>
          </Card>

          {/* Qualifications Details */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="flex-row items-center gap-2 border-b border-slate-50 pb-2 mb-2">
              <Award size={16} color="#10b981" />
              <CardTitle className="text-xs font-extrabold text-slate-400 uppercase">Academic Qualifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Highest Qualification</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.highest_qualification || 'N/A'}</Text>
              </View>
              <View className="h-px bg-slate-50" />
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Institution & Field</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">
                  {profile?.institution_name ? `${profile.institution_name} (${profile.field_of_study || 'General'})` : 'N/A'}
                </Text>
              </View>
              {profile?.completion_year && (
                <>
                  <View className="h-px bg-slate-50" />
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Completion Year</Text>
                    <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile.completion_year}</Text>
                  </View>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assignments list */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Teaching Load & Assignments</Text>
            {assignments.length > 0 ? (
              <View className="space-y-3">
                {assignments.map((ass) => (
                  <Card key={ass.id} className="bg-white border-slate-100 shadow-sm p-4 flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="font-extrabold text-slate-800 text-sm leading-snug">{ass.subjectName}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <View className="bg-slate-100 px-2 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-slate-500 uppercase">{ass.subjectCode}</Text>
                        </View>
                        <Text className="text-xs text-slate-400 font-semibold">{ass.className}</Text>
                      </View>
                    </View>
                    <BookOpen size={20} color="#cbd5e1" />
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="bg-white border-slate-100 p-6 items-center">
                <Text className="text-slate-400 italic text-xs">No subject/class assignments recorded.</Text>
              </Card>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
