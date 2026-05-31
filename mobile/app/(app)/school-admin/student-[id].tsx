import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ArrowLeft, User, GraduationCap, Calendar, BookOpen, CreditCard, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react-native';

interface StudentProfile {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
  email: string;
  phone_number?: string;
  guardian_name?: string;
  guardian_contact?: string;
  enrollment_status?: string;
}

interface GradeRecord {
  subject_name: string;
  percentage: number;
  grade: string;
  term: string;
}

interface InvoiceRecord {
  id: string;
  description: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
}

export default function StudentDetailsAdmin() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [className, setClassName] = useState<string>('Unassigned');
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStudentData = async () => {
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

      // 2. Fetch Enrollment class name
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('class_id, classes(name)')
        .eq('student_id', id)
        .eq('status', 'Active')
        .maybeSingle();

      if (enrollmentData?.classes) {
        setClassName((enrollmentData.classes as any).name);
      }

      // 3. Fetch Grades
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

      // 4. Fetch Attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', id);
      
      if (attendanceData) {
        setAttendance({
          present: attendanceData.filter(a => a.status === 'present').length,
          absent: attendanceData.filter(a => a.status === 'absent').length,
          late: attendanceData.filter(a => a.status === 'late').length
        });
      }

      // 5. Fetch Invoices
      const { data: invoicesData } = await supabase
        .from('student_invoices')
        .select('*')
        .eq('student_id', id);

      if (invoicesData) {
        setInvoices(invoicesData.map((i: any) => ({
          id: i.id,
          description: i.description || 'School Fees',
          amount: i.amount,
          amount_paid: i.amount_paid || 0,
          currency: i.currency || 'ZMW',
          status: i.status || 'unpaid'
        })));
      }

    } catch (error: any) {
      console.error('Error fetching student details:', error);
      Alert.alert('Error', 'Failed to load student record details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchStudentData();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const attendanceTotal = attendance.present + attendance.absent + attendance.late;
  const attendanceRate = attendanceTotal > 0 ? Math.round((attendance.present / attendanceTotal) * 100) : 100;

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header navbar */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Student Profile Detail</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="space-y-6 mb-20">
          
          {/* Main User Card */}
          <Card className="bg-white border-slate-100 shadow-sm items-center py-6">
            <CardContent className="items-center w-full">
              <View className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-slate-50 items-center justify-center mb-3">
                <User size={36} color="#10b981" />
              </View>
              <Text className="font-extrabold text-slate-950 text-lg">{profile?.full_name}</Text>
              <Text className="text-xs text-slate-400 font-bold uppercase mt-0.5">ID: {profile?.student_number}</Text>
              
              <View className="flex-row gap-2.5 mt-3.5">
                <View className="bg-emerald-600 px-3 py-1 rounded-full">
                  <Text className="text-white text-[9px] font-black uppercase">{className}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full bg-slate-100`}>
                  <Text className="text-slate-600 text-[9px] font-black uppercase">{profile?.enrollment_status || 'Active'}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Contact and Guardian Info */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="border-b border-slate-50 pb-2 mb-2">
              <CardTitle className="text-xs font-extrabold text-slate-400 uppercase">Information Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Email Contact</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.email || 'N/A'}</Text>
              </View>
              <View className="h-px bg-slate-50" />
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Parent/Guardian Name</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.guardian_name || 'N/A'}</Text>
              </View>
              <View className="h-px bg-slate-50" />
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase">Guardian Contact Phone</Text>
                <Text className="font-semibold text-slate-700 text-sm mt-0.5">{profile?.guardian_contact || 'N/A'}</Text>
              </View>
            </CardContent>
          </Card>

          {/* Attendance Stats Summary */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Attendance History</Text>
            <Card className="bg-white border-slate-100 shadow-sm p-4">
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">Presence Rate</Text>
                  <Text className="text-2xl font-black text-emerald-600 mt-0.5">{attendanceRate}%</Text>
                </View>
                <View className="flex-row gap-3">
                  <View className="items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase">Present</Text>
                    <Text className="text-xs font-black text-slate-800 mt-0.5">{attendance.present}</Text>
                  </View>
                  <View className="items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase">Absent</Text>
                    <Text className="text-xs font-black text-slate-800 mt-0.5">{attendance.absent}</Text>
                  </View>
                </View>
              </View>
              <View className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                <View 
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${attendanceRate}%` }}
                />
              </View>
            </Card>
          </View>

          {/* Academic performance */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Academic Performance Grades</Text>
            <Card className="bg-white border-slate-100 shadow-sm overflow-hidden p-0">
              {grades.length > 0 ? (
                <View className="divide-y divide-slate-50">
                  {grades.map((grade, idx) => (
                    <View key={idx} className="flex-row justify-between items-center p-4">
                      <View className="flex-1 mr-4">
                        <Text className="font-extrabold text-slate-800 text-sm leading-snug">{grade.subject_name}</Text>
                        <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{grade.term}</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-sm font-black text-slate-900">{grade.percentage}%</Text>
                        <View className="bg-slate-100 px-2 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-slate-600 uppercase">{grade.grade}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="p-6 items-center">
                  <Text className="text-slate-400 italic text-xs">No academic scores recorded yet.</Text>
                </View>
              )}
            </Card>
          </View>

          {/* Fee Billing status */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Billing Invoices & Balances</Text>
            <View className="space-y-3">
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const balance = inv.amount - inv.amount_paid;
                  const statusColor = inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
                  
                  return (
                    <Card key={inv.id} className="bg-white border-slate-100 shadow-sm p-4">
                      <View className="flex-row justify-between items-start mb-2.5">
                        <View className="flex-1 mr-4">
                          <Text className="font-extrabold text-slate-800 text-sm leading-snug">{inv.description}</Text>
                        </View>
                        <View className={`px-2 py-0.5 rounded ${statusColor.split(' ')[0]}`}>
                          <Text className={`text-[9px] font-bold uppercase ${statusColor.split(' ')[1]}`}>
                            {inv.status}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row justify-between pt-3 border-t border-slate-50">
                        <View>
                          <Text className="text-[9px] text-slate-400 font-bold uppercase">Total Invoiced</Text>
                          <Text className="text-slate-800 font-semibold text-xs mt-0.5">{inv.currency} {inv.amount}</Text>
                        </View>
                        <View>
                          <Text className="text-[9px] text-slate-400 font-bold uppercase">Balance Due</Text>
                          <Text className="text-slate-800 font-black text-sm mt-0.5">{inv.currency} {balance}</Text>
                        </View>
                      </View>
                    </Card>
                  );
                })
              ) : (
                <Card className="bg-white border-slate-100 p-6 items-center">
                  <Text className="text-slate-400 italic text-xs">No billing records generated.</Text>
                </Card>
              )}
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
