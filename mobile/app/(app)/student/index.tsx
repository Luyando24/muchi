import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Switch, 
  Modal 
} from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  ClipboardCheck, 
  CreditCard, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Download, 
  AlertCircle, 
  Key, 
  Power,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Megaphone,
  Building,
  Bed,
  Users
} from 'lucide-react-native';

// Interfaces matching backend returns
interface StudentProfile {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
  email: string;
  school_id: string;
  avatar_url?: string;
  guardian_name?: string;
  guardian_phone?: string;
  is_temp_password?: boolean;
  gender?: string;
}

interface School {
  id: string;
  name: string;
  current_term?: string;
  academic_year?: string;
  boarding_status?: string;
}

interface GradingScale {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description: string;
}

interface GradeRecord {
  id: string;
  percentage: number;
  grade: string;
  term: string;
  academic_year: string;
  subjects?: {
    id: string;
    name: string;
    code: string;
    department: string;
  };
}

interface TermResult {
  term: string;
  academicYear: string;
  average: number;
  grades: GradeRecord[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
}

interface AssignedSubject {
  id: string;
  name: string;
  code: string;
  department: string;
}

interface Invoice {
  id: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  due_date: string;
  description?: string;
  created_at: string;
  fee_structures?: {
    grade: string;
    term: string;
    academic_year: string;
    description?: string;
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority?: 'High' | 'Normal' | 'Low';
}

export default function StudentPortal() {
  const { signOut, user, session } = useAuth();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'results' | 'attendance' | 'fees' | 'profile' | 'accommodation'>('dashboard');
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [gradingScale, setGradingScale] = useState<GradingScale[]>([]);
  const [results, setResults] = useState<TermResult[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Accommodation States
  const [allocation, setAllocation] = useState<any>(null);
  const [roommates, setRoommates] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [pendingApp, setPendingApp] = useState<any>(null);
  const [preferredBlockId, setPreferredBlockId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [loadingAccommodation, setLoadingAccommodation] = useState(false);
  
  // Results select term
  const [selectedTermResult, setSelectedTermResult] = useState<TermResult | null>(null);
  
  // Payment states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payProvider, setPayProvider] = useState<'MTN' | 'AIRTEL'>('MTN');
  const [payPhone, setPayPhone] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [simulatedPaymentRef, setSimulatedPaymentRef] = useState<string | null>(null);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  // Security password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Mock switches
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `API error: ${response.status}`);
    }

    return response.json();
  };

  const loadAllData = async () => {
    try {
      if (!user) return;
      
      // Load consolidated portal data
      const portalData = await fetchWithAuth(`/api/student/${user.id}/portal-data`);
      
      if (portalData) {
        setProfile(portalData.student);
        setSchool(portalData.school);
        setGradingScale(portalData.gradingScale || []);
        setResults(portalData.results || []);
        setAttendance(portalData.attendance || []);
        setAssignedSubjects(portalData.assignedSubjects || []);
        
        // Pick most recent term result as default for detail view
        if (portalData.results && portalData.results.length > 0) {
          setSelectedTermResult(portalData.results[0]);
        }
      }

      // Load invoices
      const invoicesData = await fetchWithAuth('/api/finance/student/invoices');
      setInvoices(invoicesData || []);

      // Load announcements
      const announcementsData = await fetchWithAuth('/api/school/announcements').catch(() => []);
      setAnnouncements(announcementsData || []);

    } catch (error) {
      console.error('Error fetching student portal data:', error);
      Alert.alert('Error', 'Failed to fetch student records from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  const fetchAccommodationInfo = async () => {
    if (!user?.id) return;
    setLoadingAccommodation(true);
    try {
      const { data: allocData, error: allocErr } = await supabase
        .from('accommodation_allocations')
        .select(`
          *,
          room:accommodation_rooms(
            id,
            room_number,
            capacity,
            block:accommodation_blocks(id, name, gender_policy)
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'Active')
        .maybeSingle();

      if (allocErr) throw allocErr;

      if (allocData) {
        setAllocation(allocData);
        const { data: roommatesData, error: roommatesErr } = await supabase
          .from('accommodation_allocations')
          .select('*, student:profiles(id, full_name, email, phone)')
          .eq('room_id', allocData.room_id)
          .eq('status', 'Active');
        
        if (roommatesErr) throw roommatesErr;
        setRoommates(roommatesData?.filter(r => r.student_id !== user.id) || []);
      } else {
        setAllocation(null);
        setRoommates([]);
      }

      const schoolId = profile?.school_id || school?.id;
      if (schoolId) {
        const { data: blocksData, error: blocksErr } = await supabase
          .from('accommodation_blocks')
          .select('*')
          .eq('school_id', schoolId);
        
        if (blocksErr) throw blocksErr;

        const studentGender = profile?.gender;
        const filteredBlocks = blocksData?.filter(b => 
          b.gender_policy === 'Mixed' || 
          !studentGender ||
          b.gender_policy === studentGender
        ) || [];
        setBlocks(filteredBlocks);

        const { data: appData, error: appErr } = await supabase
          .from('accommodation_applications')
          .select('*, preferred_block:accommodation_blocks(name)')
          .eq('student_id', user.id)
          .in('status', ['Pending', 'Waitlisted', 'Rejected'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (appErr) throw appErr;
        setPendingApp(appData);
      }
    } catch (err: any) {
      console.error('Error fetching accommodation:', err);
      Alert.alert('Error', 'Failed to fetch accommodation data.');
    } finally {
      setLoadingAccommodation(false);
    }
  };

  const handleApplyAccommodation = async () => {
    const schoolId = profile?.school_id || school?.id;
    if (!schoolId || !user?.id) return;

    setSubmittingApp(true);
    try {
      const academicYear = school?.academic_year || new Date().getFullYear().toString();
      
      const { error } = await supabase
        .from('accommodation_applications')
        .insert({
          student_id: user.id,
          school_id: schoolId,
          academic_year: academicYear,
          preferred_block_id: (preferredBlockId && preferredBlockId !== 'none') ? preferredBlockId : null,
          notes: notes || '',
          status: 'Pending'
        });

      if (error) throw error;

      Alert.alert("Application Submitted", "Your boarding application has been successfully submitted.");
      setPreferredBlockId('');
      setNotes('');
      fetchAccommodationInfo();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Application Failed", err.message || "Failed to submit accommodation application.");
    } finally {
      setSubmittingApp(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'accommodation') {
      fetchAccommodationInfo();
    }
  }, [activeTab, profile, school]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Helper colors
  const getGradeColor = (grade: string) => {
    if (!grade) return 'bg-slate-100 text-slate-800';
    const g = grade.toUpperCase();
    if (['1', '2', 'A*', 'A'].includes(g)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (['3', '4', 'B'].includes(g)) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    if (['5', '6', 'C'].includes(g)) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (['7', '8', 'D', 'E'].includes(g)) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  const getStandardFromScale = (percentage: number) => {
    if (gradingScale && gradingScale.length > 0) {
      const sortedScale = [...gradingScale].sort((a, b) => b.min_percentage - a.min_percentage);
      for (const scale of sortedScale) {
        if (percentage >= scale.min_percentage) {
          return scale.description.toUpperCase();
        }
      }
    }
    if (percentage === 0) return 'N/A';
    if (percentage >= 75) return 'DISTINCTION';
    if (percentage >= 60) return 'MERIT';
    if (percentage >= 45) return 'PASS';
    return 'FAIL';
  };

  // Payment mock actions
  const handleInitiatePayment = async () => {
    if (!selectedInvoice) return;
    const amountNum = parseFloat(payAmount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a positive payment amount.');
      return;
    }

    const outstanding = selectedInvoice.amount - selectedInvoice.amount_paid;
    if (amountNum > outstanding) {
      Alert.alert('Invalid Amount', `Maximum allowed payment is ${selectedInvoice.currency} ${outstanding}`);
      return;
    }

    if (payPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await fetchWithAuth('/api/finance/pay/initiate', {
        method: 'POST',
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          amount: amountNum,
          provider: payProvider,
          phone_number: payPhone
        })
      });

      if (result.success && result.payment) {
        setSimulatedPaymentRef(result.payment.provider_reference);
        setPaymentModalOpen(false);
        setSimulationModalOpen(true);
      } else {
        Alert.alert('Payment Failed', result.message || 'Payment initiation failed.');
      }
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Could not initiate payment.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!simulatedPaymentRef) return;
    setPaymentLoading(true);
    try {
      const result = await fetchWithAuth('/api/finance/pay/webhook', {
        method: 'POST',
        body: JSON.stringify({
          referenceId: simulatedPaymentRef,
          status: 'SUCCESSFUL',
          financialTransactionId: 'TXN-' + Math.floor(1000000 + Math.random() * 9000000)
        })
      });

      if (result.received) {
        Alert.alert('Success', 'Mock payment processed successfully! Pull to refresh invoices.');
        setSimulationModalOpen(false);
        loadAllData();
      }
    } catch (error: any) {
      Alert.alert('Simulation Error', error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Password reset actions
  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Update local profile to clear temporary password flags if they existed
      await supabase
        .from('profiles')
        .update({
          is_temp_password: false,
          temp_password_expires_at: null,
          temp_password_set_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      Alert.alert('Success', 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMockPdfDownload = () => {
    Alert.alert(
      'Export Report Card',
      'Your Term Report Card has been compiled into a secure PDF format. Would you like to save it to your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => Alert.alert('Success', 'Report card PDF saved to Downloads folder.') 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // Calculate dashboard stats
  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;
  
  const currentResult = results[0];
  const currentAverage = currentResult ? currentResult.average : 0;
  const recentGrades = currentResult ? currentResult.grades : [];

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Top Navbar */}
      <View className="bg-white border-b border-slate-100 px-6 py-4 flex-row justify-between items-center">
        <View>
          <Text className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
            {school?.name || 'MUCHI School'}
          </Text>
          <Text className="text-xl font-extrabold text-slate-900 truncate max-w-[200px]">
            {profile?.full_name || user?.email?.split('@')[0]}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => setActiveTab('profile')} 
          className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 items-center justify-center shadow-sm overflow-hidden"
        >
          {profile?.avatar_url ? (
            <View className="flex-1" /> // Fallback placeholder if actual images aren't present
          ) : (
            <User size={20} color="#4f46e5" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView 
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {profile?.is_temp_password && (
          <Card className="bg-amber-50 border-amber-200 mb-6">
            <CardContent className="p-4 flex-row items-start gap-3">
              <AlertCircle size={20} color="#d97706" className="mt-0.5" />
              <View className="flex-1">
                <Text className="font-extrabold text-amber-900 text-sm">Security Reminder</Text>
                <Text className="text-xs text-amber-700 mt-1 leading-relaxed">
                  You are currently using a temporary password. Please set a secure password in Settings.
                </Text>
                <TouchableOpacity onPress={() => setActiveTab('profile')} className="mt-2">
                  <Text className="text-xs font-black text-amber-900 underline">Change Password Now</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        )}

        {/* ==================== TAB 1: DASHBOARD ==================== */}
        {activeTab === 'dashboard' && (
          <View className="space-y-6 mb-10">
            {/* Quick Stats Grid */}
            <View className="flex-row gap-4">
              <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                <CardContent className="items-center py-4">
                  <Award size={24} color="#4f46e5" className="mb-2" />
                  <Text className="text-xl font-black text-slate-900">
                    {currentAverage > 0 ? `${currentAverage}%` : 'N/A'}
                  </Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Average Score</Text>
                </CardContent>
              </Card>

              <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                <CardContent className="items-center py-4">
                  <BookOpen size={24} color="#10b981" className="mb-2" />
                  <Text className="text-xl font-black text-slate-900">{assignedSubjects.length}</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Subjects</Text>
                </CardContent>
              </Card>

              <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                <CardContent className="items-center py-4">
                  <ClipboardCheck size={24} color="#f59e0b" className="mb-2" />
                  <Text className="text-xl font-black text-slate-900">{attendanceRate}%</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Attendance</Text>
                </CardContent>
              </Card>
            </View>

            {/* Overall Standard */}
            {currentAverage > 0 && (
              <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 border-none shadow-md">
                <CardContent className="p-5 flex-row justify-between items-center">
                  <View>
                    <Text className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Overall Standard</Text>
                    <Text className="text-white text-xl font-black mt-0.5">
                      {getStandardFromScale(currentAverage)}
                    </Text>
                  </View>
                  <View className="bg-white/20 px-3.5 py-1.5 rounded-full border border-white/10">
                    <Text className="text-white text-xs font-black uppercase">Term {currentResult?.term}</Text>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* School Announcements */}
            <View>
              <Text className="text-base font-extrabold text-slate-800 mb-3">School Announcements</Text>
              {announcements.length > 0 ? (
                <View className="space-y-3">
                  {announcements.slice(0, 2).map((ann) => (
                    <Card key={ann.id} className="bg-white border-slate-100 shadow-sm">
                      <CardContent className="p-4 flex-row gap-3">
                        <View className={`w-8 h-8 rounded-full items-center justify-center ${ann.priority === 'High' ? 'bg-red-50' : 'bg-blue-50'}`}>
                          <Megaphone size={14} color={ann.priority === 'High' ? '#ef4444' : '#3b82f6'} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between items-center">
                            <Text className="font-extrabold text-slate-800 text-sm">{ann.title}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase">{ann.date}</Text>
                          </View>
                          <Text className="text-xs text-slate-500 mt-1 leading-relaxed">{ann.content}</Text>
                        </View>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              ) : (
                <Card className="bg-white border-slate-100 shadow-sm p-4 items-center">
                  <Text className="text-slate-400 italic text-xs">No announcements at this time.</Text>
                </Card>
              )}
            </View>

            {/* Recent Scores */}
            <View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-extrabold text-slate-800">Recent Academic Scores</Text>
                <TouchableOpacity onPress={() => setActiveTab('results')}>
                  <Text className="text-xs font-bold text-indigo-600">View All</Text>
                </TouchableOpacity>
              </View>
              
              <Card className="bg-white border-slate-100 shadow-sm">
                <CardContent className="p-0">
                  {recentGrades.length > 0 ? (
                    <View className="divide-y divide-slate-50">
                      {recentGrades.slice(0, 4).map((grade, idx) => (
                        <View key={idx} className="flex-row justify-between items-center p-4">
                          <View className="flex-1 mr-4">
                            <Text className="font-extrabold text-slate-800 text-sm">{grade.subjects?.name}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{grade.subjects?.code}</Text>
                          </View>
                          <View className="flex-row items-center gap-3">
                            <Text className="text-sm font-black text-slate-900">{grade.percentage}%</Text>
                            <View className={`px-2 py-0.5 rounded ${getGradeColor(grade.grade).split(' ')[0]}`}>
                              <Text className={`text-[10px] font-bold uppercase ${getGradeColor(grade.grade).split(' ')[1]}`}>
                                {grade.grade}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="p-6 items-center">
                      <Text className="text-slate-400 italic text-xs">No grades recorded for this term.</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          </View>
        )}

        {/* ==================== TAB 2: SUBJECTS ==================== */}
        {activeTab === 'subjects' && (
          <View className="space-y-4 mb-10">
            <Text className="text-base font-extrabold text-slate-800 mb-1">Enrolled Subjects</Text>
            {assignedSubjects.length > 0 ? (
              assignedSubjects.map((sub) => (
                <Card key={sub.id} className="bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 flex-row justify-between items-center">
                    <View>
                      <Text className="font-extrabold text-slate-800 text-base">{sub.name}</Text>
                      <View className="flex-row items-center gap-2 mt-1.5">
                        <View className="bg-slate-100 px-2 py-0.5 rounded">
                          <Text className="text-[9px] font-bold text-slate-500 uppercase">{sub.code}</Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 font-medium">{sub.department}</Text>
                      </View>
                    </View>
                    <BookOpen size={20} color="#cbd5e1" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white border-slate-100 p-8 items-center justify-center">
                <BookOpen size={40} color="#cbd5e1" className="mb-2" />
                <Text className="text-slate-400 font-bold">No Enrolled Subjects</Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center">Contact administration if you believe this is an error.</Text>
              </Card>
            )}
          </View>
        )}

        {/* ==================== TAB 3: RESULTS ==================== */}
        {activeTab === 'results' && (
          <View className="space-y-6 mb-10">
            {/* Term selector horizontal list */}
            {results.length > 0 ? (
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Select Academic Term</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
                  {results.map((r, i) => (
                    <TouchableOpacity 
                      key={i} 
                      onPress={() => setSelectedTermResult(r)}
                      className={`px-4 py-2.5 rounded-2xl border ${selectedTermResult?.term === r.term && selectedTermResult?.academicYear === r.academicYear ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}
                    >
                      <Text className={`text-xs font-extrabold ${selectedTermResult?.term === r.term && selectedTermResult?.academicYear === r.academicYear ? 'text-white' : 'text-slate-600'}`}>
                        Term {r.term} ({r.academicYear})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {selectedTermResult ? (
              <View className="space-y-4">
                {/* Term Summary Card */}
                <Card className="bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 flex-row justify-between items-center">
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Term Performance</Text>
                      <Text className="text-lg font-black text-slate-800 mt-1">Average: {selectedTermResult.average}%</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={handleMockPdfDownload}
                      className="bg-indigo-50 border border-indigo-100 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} color="#4f46e5" />
                      <Text className="text-indigo-600 font-extrabold text-[10px] uppercase">Export PDF</Text>
                    </TouchableOpacity>
                  </CardContent>
                </Card>

                {/* Term Report card grades table */}
                <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <View className="bg-slate-50 flex-row px-4 py-3 border-b border-slate-100">
                      <Text className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject</Text>
                      <Text className="w-16 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Score</Text>
                      <Text className="w-16 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Grade</Text>
                    </View>
                    <View className="divide-y divide-slate-50">
                      {selectedTermResult.grades.map((grade) => (
                        <View key={grade.id} className="flex-row items-center px-4 py-3.5">
                          <View className="flex-1">
                            <Text className="font-extrabold text-slate-800 text-sm">{grade.subjects?.name}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              {grade.grade === 'ABSENT' ? 'NOT RECORDED' : getStandardFromScale(grade.percentage)}
                            </Text>
                          </View>
                          <Text className="w-16 text-center font-black text-slate-900 text-sm">{grade.percentage}%</Text>
                          <View className="w-16 items-center">
                            <View className={`px-2 py-0.5 rounded ${getGradeColor(grade.grade).split(' ')[0]}`}>
                              <Text className={`text-[10px] font-bold uppercase ${getGradeColor(grade.grade).split(' ')[1]}`}>{grade.grade}</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </CardContent>
                </Card>
              </View>
            ) : (
              <Card className="bg-white border-slate-100 p-8 items-center justify-center">
                <Award size={40} color="#cbd5e1" className="mb-2" />
                <Text className="text-slate-400 font-bold">No Results Found</Text>
                <Text className="text-slate-400 text-[10px] mt-1 text-center">Results will appear here once officially published.</Text>
              </Card>
            )}
          </View>
        )}

        {/* ==================== TAB 4: ATTENDANCE ==================== */}
        {activeTab === 'attendance' && (
          <View className="space-y-6 mb-10">
            {/* Summary statistics */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-5 flex-row justify-between items-center">
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</Text>
                  <Text className="text-3xl font-black text-indigo-600 mt-1">{attendanceRate}%</Text>
                </View>
                <View className="flex-row gap-4 border-l border-slate-100 pl-5">
                  <View className="items-center">
                    <Text className="text-xs font-bold text-slate-400 uppercase">Present</Text>
                    <Text className="text-base font-black text-slate-800 mt-0.5">{presentAttendance}</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xs font-bold text-slate-400 uppercase">Absent</Text>
                    <Text className="text-base font-black text-slate-800 mt-0.5">{attendance.filter(a => a.status === 'absent').length}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Daily logs list */}
            <View>
              <Text className="text-base font-extrabold text-slate-800 mb-3">Attendance History Log</Text>
              <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {attendance.length > 0 ? (
                    <View className="divide-y divide-slate-50">
                      {attendance.map((record) => (
                        <View key={record.id} className="flex-row justify-between items-center p-4">
                          <View className="flex-row items-center gap-3">
                            <View className={`w-8 h-8 rounded-full items-center justify-center ${record.status === 'present' ? 'bg-emerald-50' : record.status === 'absent' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                              {record.status === 'present' ? (
                                <CheckCircle2 size={16} color="#10b981" />
                              ) : record.status === 'absent' ? (
                                <XCircle size={16} color="#ef4444" />
                              ) : (
                                <Clock size={16} color="#f59e0b" />
                              )}
                            </View>
                            <View>
                              <Text className="font-extrabold text-slate-800 text-sm">
                                {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                              </Text>
                              {record.remarks ? (
                                <Text className="text-[10px] text-slate-400 font-medium italic mt-0.5">"{record.remarks}"</Text>
                              ) : null}
                            </View>
                          </View>
                          <View className={`px-2.5 py-1 rounded-full ${record.status === 'present' ? 'bg-emerald-100' : record.status === 'absent' ? 'bg-rose-100' : 'bg-amber-100'}`}>
                            <Text className={`text-[9px] font-bold uppercase ${record.status === 'present' ? 'text-emerald-700' : record.status === 'absent' ? 'text-rose-700' : 'text-amber-700'}`}>
                              {record.status}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="p-8 items-center justify-center">
                      <ClipboardCheck size={36} color="#cbd5e1" className="mb-2" />
                      <Text className="text-slate-400 italic text-xs">No attendance history logged.</Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            </View>
          </View>
        )}

        {/* ==================== TAB 5: FEES ==================== */}
        {activeTab === 'fees' && (
          <View className="space-y-6 mb-10">
            {/* Outstanding balance summary */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-none shadow-md">
              <CardContent className="p-6">
                <Text className="text-white/60 text-xs font-bold uppercase tracking-wider">Total Outstanding Balance</Text>
                <Text className="text-white text-3xl font-black mt-1">
                  ZMW {invoices.reduce((sum, inv) => sum + (inv.status !== 'paid' ? (inv.amount - inv.amount_paid) : 0), 0).toFixed(2)}
                </Text>
                <View className="h-px bg-white/10 my-4" />
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-white/40 text-[9px] font-bold uppercase">Total Invoiced</Text>
                    <Text className="text-white font-extrabold text-sm mt-0.5">ZMW {invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text className="text-white/40 text-[9px] font-bold uppercase">Total Paid</Text>
                    <Text className="text-white font-extrabold text-sm mt-0.5">ZMW {invoices.reduce((sum, inv) => sum + inv.amount_paid, 0).toFixed(2)}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Invoices list */}
            <View>
              <Text className="text-base font-extrabold text-slate-800 mb-3">Invoices & Statements</Text>
              <View className="space-y-4.5">
                {invoices.length > 0 ? (
                  invoices.map((inv) => {
                    const balance = inv.amount - inv.amount_paid;
                    const paidColor = inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
                    const paidStatusLabel = inv.status === 'paid' ? 'Fully Paid' : inv.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
                    
                    return (
                      <Card key={inv.id} className="bg-white border-slate-100 shadow-sm overflow-hidden">
                        <CardContent className="p-4">
                          <View className="flex-row justify-between items-start mb-2.5">
                            <View className="flex-1 mr-4">
                              <Text className="font-extrabold text-slate-800 text-sm">
                                {inv.description || inv.fee_structures?.description || 'School Fee Invoice'}
                              </Text>
                              <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                {inv.fee_structures?.term || 'Current Term'} • {inv.fee_structures?.academic_year || 'Academic Year'}
                              </Text>
                            </View>
                            <View className={`px-2 py-0.5 rounded ${paidColor.split(' ')[0]}`}>
                              <Text className={`text-[9px] font-bold uppercase ${paidColor.split(' ')[1]}`}>
                                {paidStatusLabel}
                              </Text>
                            </View>
                          </View>

                          <View className="flex-row justify-between items-end pt-3 border-t border-slate-50">
                            <View>
                              <Text className="text-[9px] text-slate-400 font-bold uppercase">Balance Due</Text>
                              <Text className="text-slate-800 font-black text-base mt-0.5">
                                {inv.currency} {balance.toFixed(2)}
                              </Text>
                            </View>
                            
                            {inv.status !== 'paid' && (
                              <TouchableOpacity 
                                onPress={() => {
                                  setSelectedInvoice(inv);
                                  setPayAmount(balance.toString());
                                  setPayPhone('');
                                  setPaymentModalOpen(true);
                                }}
                                className="bg-indigo-600 px-4 py-2 rounded-xl shadow-sm"
                              >
                                <Text className="text-white text-[10px] font-black uppercase tracking-wider">Pay Fee</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="bg-white border-slate-100 p-8 items-center justify-center">
                    <CreditCard size={36} color="#cbd5e1" className="mb-2" />
                    <Text className="text-slate-400 italic text-xs">No invoices generated yet.</Text>
                  </Card>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 6: PROFILE ==================== */}
        {activeTab === 'profile' && (
          <View className="space-y-6 mb-10">
            {/* Student Profile Card */}
            <Card className="bg-white border-slate-100 shadow-sm items-center py-6">
              <CardContent className="items-center w-full">
                <View className="w-20 h-20 rounded-full bg-indigo-50 border-4 border-slate-50 items-center justify-center mb-3">
                  <User size={36} color="#4f46e5" />
                </View>
                <Text className="font-extrabold text-slate-900 text-lg">{profile?.full_name}</Text>
                <Text className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">ID: {profile?.student_number}</Text>
                <View className="bg-indigo-600 px-3.5 py-1 rounded-full mt-3">
                  <Text className="text-white text-[9px] font-black uppercase tracking-widest">{profile?.grade}</Text>
                </View>
              </CardContent>
            </Card>

            {/* Profile Information List */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</Text>
                  <Text className="font-extrabold text-slate-800 text-sm mt-0.5">{profile?.email}</Text>
                </View>
                <View className="h-px bg-slate-50" />
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parent/Guardian Name</Text>
                  <Text className="font-extrabold text-slate-800 text-sm mt-0.5">{profile?.guardian_name || 'Not Available'}</Text>
                </View>
                <View className="h-px bg-slate-50" />
                <View>
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guardian Phone Contact</Text>
                  <Text className="font-extrabold text-slate-800 text-sm mt-0.5">{profile?.guardian_phone || 'Not Available'}</Text>
                </View>
              </CardContent>
            </Card>

            {/* Update Password settings */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold text-slate-800 flex-row items-center gap-1.5">
                  <Key size={16} color="#64748b" />
                  Update Security Password
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Input 
                  placeholder="New Secure Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <Input 
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
                <Button 
                  title="Change Password"
                  onPress={handlePasswordUpdate}
                  loading={passwordLoading}
                  className="bg-indigo-600 mt-2 h-11"
                />
              </CardContent>
            </Card>

            {/* Notification settings */}
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="font-extrabold text-slate-800 text-sm">Push Notifications</Text>
                    <Text className="text-[10px] text-slate-400 font-medium">Receive grade alerts and updates</Text>
                  </View>
                  <Switch value={notifPush} onValueChange={setNotifPush} />
                </View>
                <View className="h-px bg-slate-50" />
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="font-extrabold text-slate-800 text-sm">Email Reports</Text>
                    <Text className="text-[10px] text-slate-400 font-medium">Receive term reports via email</Text>
                  </View>
                  <Switch value={notifEmail} onValueChange={setNotifEmail} />
                </View>
              </CardContent>
            </Card>

            {/* Sign Out Action */}
            <TouchableOpacity 
              onPress={signOut}
              className="bg-white p-4 rounded-xl flex-row items-center justify-center gap-2 border border-rose-100 shadow-sm mb-10"
            >
              <Power size={18} color="#ef4444" />
              <Text className="text-rose-600 font-black uppercase text-xs tracking-wider">Sign Out Portal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================== TAB 7: ACCOMMODATION ==================== */}
        {activeTab === 'accommodation' && (
          <View className="space-y-6 mb-10">
            <View>
              <Text className="text-base font-extrabold text-slate-800">Accommodation & Boarding</Text>
              <Text className="text-xs text-slate-400 mt-0.5">View room assignment or submit a boarding application</Text>
            </View>

            {loadingAccommodation ? (
              <View className="py-12 justify-center items-center">
                <ActivityIndicator size="large" color="#4f46e5" />
              </View>
            ) : allocation ? (
              <View className="space-y-4">
                {/* Active Allocation Card */}
                <Card className="bg-white border-slate-100 shadow-sm">
                  <CardHeader className="pb-2 flex-row items-center gap-2">
                    <Building size={20} color="#4f46e5" />
                    <CardTitle className="text-sm font-extrabold text-slate-800">Active Room Allocation</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hostel Block</Text>
                        <View className="flex-row items-center gap-2 mt-0.5">
                          <Text className="font-extrabold text-slate-800 text-sm">{allocation.room?.block?.name}</Text>
                          <View className="bg-indigo-50 px-2 py-0.5 rounded">
                            <Text className="text-[9px] font-black text-indigo-700 uppercase">
                              {allocation.room?.block?.gender_policy}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="h-px bg-slate-200" />
                      <View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Room Number</Text>
                        <Text className="font-extrabold text-slate-800 text-sm mt-0.5">{allocation.room?.room_number}</Text>
                      </View>
                      <View className="h-px bg-slate-200" />
                      <View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Room Capacity</Text>
                        <Text className="font-extrabold text-slate-800 text-sm mt-0.5">{allocation.room?.capacity} Beds</Text>
                      </View>
                      <View className="h-px bg-slate-200" />
                      <View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Check-in Date</Text>
                        <Text className="font-extrabold text-slate-700 text-sm mt-0.5">
                          {allocation.check_in_date ? new Date(allocation.check_in_date).toLocaleDateString() : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>

                {/* Roommates Card */}
                <Card className="bg-white border-slate-100 shadow-sm">
                  <CardHeader className="pb-2 flex-row items-center gap-2">
                    <Users size={20} color="#10b981" />
                    <CardTitle className="text-sm font-extrabold text-slate-800">My Roommates</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {roommates.length > 0 ? (
                      <View className="divide-y divide-slate-100">
                        {roommates.map((rm) => (
                          <View key={rm.id} className="py-3 flex-row justify-between items-center first:pt-0 last:pb-0">
                            <View>
                              <Text className="font-extrabold text-slate-800 text-sm">{rm.student?.full_name}</Text>
                              <Text className="text-xs text-slate-400 mt-0.5">{rm.student?.email || 'No email'}</Text>
                            </View>
                            {rm.student?.phone && (
                              <View className="bg-slate-100 px-2.5 py-1 rounded-full">
                                <Text className="text-[10px] font-bold text-slate-600">{rm.student.phone}</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="py-6 items-center">
                        <Text className="text-slate-400 italic text-xs">No roommates allocated yet.</Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              </View>
            ) : (
              <View className="space-y-4">
                {/* Info Alert */}
                <Card className="bg-indigo-50 border-indigo-100 shadow-sm">
                  <CardContent className="p-4 flex-row items-start gap-3">
                    <Bed size={20} color="#4f46e5" className="mt-0.5" />
                    <View className="flex-1">
                      <Text className="font-extrabold text-indigo-900 text-sm">No Room Assigned</Text>
                      <Text className="text-xs text-indigo-700 mt-1 leading-relaxed">
                        You do not currently have a hostel assignment. Submit a boarding request below.
                      </Text>
                    </View>
                  </CardContent>
                </Card>

                {/* Application status if any */}
                {pendingApp && (
                  <Card className={`bg-white border-slate-100 shadow-sm border-l-4 ${
                    pendingApp.status === 'Pending' ? 'border-l-amber-500' :
                    pendingApp.status === 'Waitlisted' ? 'border-l-indigo-500' :
                    'border-l-rose-500'
                  }`}>
                    <CardHeader className="pb-2 flex-row justify-between items-center">
                      <CardTitle className="text-sm font-extrabold text-slate-800">Hostel Request Status</CardTitle>
                      <View className={`px-2 py-0.5 rounded ${
                        pendingApp.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                        pendingApp.status === 'Waitlisted' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        <Text className="text-[10px] font-bold uppercase">{pendingApp.status}</Text>
                      </View>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <View>
                        <Text className="text-[10px] text-slate-400 font-bold uppercase font-black">Preferred Block</Text>
                        <Text className="font-extrabold text-slate-800 text-sm mt-0.5">
                          {pendingApp.preferred_block?.name || 'Any Block'}
                        </Text>
                      </View>
                      {pendingApp.notes ? (
                        <View>
                          <Text className="text-[10px] text-slate-400 font-bold uppercase font-black">Application Notes</Text>
                          <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                            <Text className="text-xs text-slate-500 italic">"{pendingApp.notes}"</Text>
                          </View>
                        </View>
                      ) : null}
                      <Text className="text-[9px] font-bold text-slate-400 uppercase mt-2">
                        Submitted: {new Date(pendingApp.created_at).toLocaleDateString()}
                      </Text>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Form */}
                {(!pendingApp || pendingApp.status === 'Rejected') && (
                  <Card className="bg-white border-slate-100 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-extrabold text-slate-800">Request Boarding Status</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {/* Preferred block list */}
                      <View className="space-y-1">
                        <Text className="text-xs font-bold text-slate-500">Hostel Preference</Text>
                        <View className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden p-1">
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1 gap-2">
                            <TouchableOpacity 
                              onPress={() => setPreferredBlockId('none')}
                              className={`px-4 py-2 rounded-full border ${preferredBlockId === 'none' || preferredBlockId === '' ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                            >
                              <Text className={`text-xs font-extrabold ${preferredBlockId === 'none' || preferredBlockId === '' ? 'text-white' : 'text-slate-600'}`}>
                                No Preference
                              </Text>
                            </TouchableOpacity>
                            {blocks.map(b => (
                              <TouchableOpacity 
                                key={b.id}
                                onPress={() => setPreferredBlockId(b.id)}
                                className={`px-4 py-2 rounded-full border ${preferredBlockId === b.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                              >
                                <Text className={`text-xs font-extrabold ${preferredBlockId === b.id ? 'text-white' : 'text-slate-600'}`}>
                                  {b.name} ({b.gender_policy})
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>

                      {/* Notes input */}
                      <View className="space-y-1">
                        <Text className="text-xs font-bold text-slate-500">Application Notes / Details</Text>
                        <TextInput 
                          multiline
                          numberOfLines={4}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Describe any special reasons or details for your accommodation request (e.g. distance to school, medical requirements, etc.)"
                          placeholderTextColor="#94a3b8"
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 min-h-[80px]"
                        />
                      </View>

                      <Button 
                        title="Submit Boarding Request"
                        onPress={handleApplyAccommodation}
                        loading={submittingApp}
                        className="bg-indigo-600 h-11"
                      />
                    </CardContent>
                  </Card>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================== INLINE BOTTOM TAB BAR ==================== */}
      <View className="bg-white border-t border-slate-100 h-[65px] flex-row justify-around items-center px-2 shadow-lg">
        <TabButton 
          icon={<LayoutDashboard size={20} color={activeTab === 'dashboard' ? '#4f46e5' : '#94a3b8'} />}
          label="Home"
          active={activeTab === 'dashboard'}
          onPress={() => setActiveTab('dashboard')}
        />
        <TabButton 
          icon={<BookOpen size={20} color={activeTab === 'subjects' ? '#4f46e5' : '#94a3b8'} />}
          label="Subjects"
          active={activeTab === 'subjects'}
          onPress={() => setActiveTab('subjects')}
        />
        <TabButton 
          icon={<Award size={20} color={activeTab === 'results' ? '#4f46e5' : '#94a3b8'} />}
          label="Results"
          active={activeTab === 'results'}
          onPress={() => setActiveTab('results')}
        />
        <TabButton 
          icon={<ClipboardCheck size={20} color={activeTab === 'attendance' ? '#4f46e5' : '#94a3b8'} />}
          label="Attendance"
          active={activeTab === 'attendance'}
          onPress={() => setActiveTab('attendance')}
        />
        {school?.boarding_status && school.boarding_status !== 'Day' && (
          <TabButton 
            icon={<Building size={20} color={activeTab === 'accommodation' ? '#4f46e5' : '#94a3b8'} />}
            label="Hostel"
            active={activeTab === 'accommodation'}
            onPress={() => setActiveTab('accommodation')}
          />
        )}
        <TabButton 
          icon={<CreditCard size={20} color={activeTab === 'fees' ? '#4f46e5' : '#94a3b8'} />}
          label="Fees"
          active={activeTab === 'fees'}
          onPress={() => setActiveTab('fees')}
        />
      </View>

      {/* ==================== MODAL: PAYMENTS SHEET ==================== */}
      <Modal
        visible={paymentModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaymentModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 space-y-5">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-black text-slate-800">Mobile Money Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalOpen(false)} className="p-1">
                <XCircle size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedInvoice && (
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selected Invoice</Text>
                <Text className="text-slate-800 font-extrabold text-sm mt-1">{selectedInvoice.description || 'School Fees'}</Text>
                <Text className="text-slate-900 font-black text-base mt-2">
                  ZMW {(selectedInvoice.amount - selectedInvoice.amount_paid).toFixed(2)}
                </Text>
              </View>
            )}

            {/* Provider Selection */}
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => setPayProvider('MTN')}
                className={`flex-1 p-3.5 rounded-2xl items-center border ${payProvider === 'MTN' ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-slate-100'}`}
              >
                <Text className="font-extrabold text-yellow-800 text-sm">MTN MoMo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setPayProvider('AIRTEL')}
                className={`flex-1 p-3.5 rounded-2xl items-center border ${payProvider === 'AIRTEL' ? 'bg-red-50 border-red-400' : 'bg-white border-slate-100'}`}
              >
                <Text className="font-extrabold text-red-800 text-sm">Airtel Money</Text>
              </TouchableOpacity>
            </View>

            <Input 
              label="MoMo Mobile Number"
              placeholder="e.g. 0961234567"
              keyboardType="phone-pad"
              value={payPhone}
              onChangeText={setPayPhone}
            />

            <Input 
              label="Payment Amount (ZMW)"
              placeholder="Enter amount to pay"
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
            />

            {/* Convenience fee simulation view */}
            {parseFloat(payAmount) > 0 && (
              <View className="flex-row justify-between items-center py-2 px-1 text-slate-500">
                <Text className="text-xs font-semibold">Convenience Fee:</Text>
                <Text className="text-xs font-extrabold text-slate-700">
                  ZMW {(parseFloat(payAmount) * (payProvider === 'MTN' ? 0.03 : 0.025)).toFixed(2)}
                </Text>
              </View>
            )}

            <Button 
              title="Initiate Transaction"
              onPress={handleInitiatePayment}
              loading={paymentLoading}
              className="bg-indigo-600 h-13"
            />
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL: WEBHOOK SIMULATOR ==================== */}
      <Modal
        visible={simulationModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSimulationModalOpen(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-6">
          <Card className="bg-white w-full border-none shadow-xl max-w-sm rounded-3xl p-6">
            <CardHeader className="items-center mb-3">
              <ShieldAlert size={48} color="#f59e0b" className="mb-2" />
              <CardTitle className="text-lg font-black text-center text-slate-800">MoMo Webhook Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Text className="text-xs text-slate-500 text-center leading-relaxed">
                In production, MTN/Airtel gateways call our secure webhook with payment confirmations. 
                Use this dashboard control to simulate a successful client verification event.
              </Text>
              <View className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <Text className="text-[9px] text-slate-400 font-bold uppercase">Provider Reference</Text>
                <Text className="font-mono text-slate-700 text-xs mt-1" numberOfLines={1}>
                  {simulatedPaymentRef || 'PENDING...'}
                </Text>
              </View>
              <Button 
                title="Simulate Success Callback"
                onPress={handleSimulateWebhook}
                loading={paymentLoading}
                className="bg-emerald-600 h-12"
              />
              <Button 
                title="Cancel Simulation"
                variant="outline"
                onPress={() => setSimulationModalOpen(false)}
                className="h-11"
              />
            </CardContent>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Inline tab button helper
function TabButton({ icon, label, active, onPress }: { icon: any, label: string, active: boolean, onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center justify-center flex-1 py-1">
      {icon}
      <Text className={`text-[9px] font-bold mt-1 uppercase tracking-tight ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
