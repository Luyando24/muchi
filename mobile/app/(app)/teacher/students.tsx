import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput, 
  RefreshControl 
} from 'react-native';
import { Users, Search, ArrowLeft, ChevronRight, BookOpen, GraduationCap } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent } from '../../../components/ui/Card';
import { useRouter } from 'expo-router';

interface SchoolClass {
  id: string;
  name: string;
  section: string;
  student_count?: number;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

export default function StudentsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchWithAuth = async (endpoint: string) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  const fetchClassesAndRoster = async () => {
    try {
      const classesData = await fetchWithAuth('/api/teacher/classes');
      setClasses(classesData || []);
      
      if (classesData && classesData.length > 0) {
        // If not selected yet, select first class
        const defaultId = selectedClassId || classesData[0].id;
        setSelectedClassId(defaultId);
        await fetchStudents(defaultId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    setLoadingRoster(true);
    try {
      const rosterData = await fetchWithAuth(`/api/teacher/classes/${classId}/students`);
      setStudents(rosterData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setLoadingRoster(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClassesAndRoster();
  }, []);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    fetchStudents(classId);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassesAndRoster();
  };

  // Filter students based on name/ID search query
  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && classes.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Navbar Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Student Directory</Text>
      </View>

      {/* Class Selector horizontal list */}
      {classes.length > 0 && (
        <View className="bg-white border-b border-slate-100 py-3 px-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
            {classes.map((cls) => {
              const isActive = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => handleClassChange(cls.id)}
                  className={`px-5 py-2.5 rounded-2xl border ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-200' 
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <Text 
                    className={`text-xs font-black tracking-wider ${
                      isActive ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {cls.name} ({cls.student_count || 0})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View className="p-5 bg-white border-b border-slate-100 flex-row items-center">
        <View className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 flex-row items-center">
          <Search size={16} color="#94a3b8" className="mr-2" />
          <TextInput
            placeholder="Search student by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 h-11 text-xs font-semibold text-slate-700"
          />
        </View>
      </View>

      {/* Roster Scroll Container */}
      <ScrollView 
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="space-y-4 mb-20">
          {loadingRoster ? (
            <ActivityIndicator size="small" color="#4f46e5" className="py-20" />
          ) : filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <TouchableOpacity
                key={student.id}
                onPress={() => router.push(`/(app)/teacher/${student.id}`)}
              >
                <Card className="bg-white border-slate-100 shadow-sm overflow-hidden p-4">
                  <CardContent className="p-0 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 bg-indigo-50 rounded-full items-center justify-center">
                        <GraduationCap size={20} color="#4f46e5" />
                      </View>
                      <View>
                        <Text className="font-extrabold text-slate-800 text-sm leading-snug">{student.name}</Text>
                        <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">ID: {student.studentId}</Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color="#cbd5e1" />
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card className="bg-white border-slate-100 p-8 items-center justify-center min-h-[220px]">
              <Users size={48} color="#cbd5e1" className="mb-2" />
              <Text className="text-slate-400 font-bold">No Students Found</Text>
              <Text className="text-slate-400 text-[10px] mt-1 text-center px-6">
                No students match your query. Try resetting your search or picking a different class filter.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
