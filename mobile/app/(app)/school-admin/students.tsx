import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Search, Filter } from 'lucide-react-native';
import { Input } from '../../../components/ui/Input';

interface Student {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
  email: string;
}

export default function StudentList() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    try {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!adminProfile) return;

      let query = supabase
        .from('profiles')
        .select('id, full_name, student_number, grade, email')
        .eq('school_id', adminProfile.school_id)
        .eq('role', 'student')
        .order('full_name');

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,student_number.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity 
      className="p-4 bg-white border-b border-border flex-row items-center gap-4"
      onPress={() => {}} // Could link to a details view if needed
    >
      <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center">
        <User size={20} color="#4f46e5" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-slate-800">{item.full_name}</Text>
        <Text className="text-[10px] text-muted-foreground">{item.student_number} • {item.email}</Text>
      </View>
      <View className="bg-slate-100 px-2 py-1 rounded">
        <Text className="text-[10px] font-bold text-slate-600">{item.grade}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Students</Text>
      </View>

      <View className="p-4 bg-white border-b border-border">
        <View className="relative">
          <View className="absolute left-3 top-3.5 z-10">
            <Search size={16} color="#94a3b8" />
          </View>
          <Input 
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 h-11"
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#4f46e5" className="mt-20" />
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-muted-foreground italic">No students found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
