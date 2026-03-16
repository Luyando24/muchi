import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, Briefcase } from 'lucide-react-native';
import { Input } from '../../../components/ui/Input';

interface Teacher {
  id: string;
  full_name: string;
  email: string;
}

export default function TeacherList() {
  const { user } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeachers = async () => {
    try {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!adminProfile) return;

      let query = supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('school_id', adminProfile.school_id)
        .eq('role', 'teacher')
        .order('full_name');

      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeachers();
  };

  const renderTeacher = ({ item }: { item: Teacher }) => (
    <View className="p-4 bg-white border-b border-border flex-row items-center gap-4">
      <View className="w-10 h-10 bg-emerald-100 rounded-full items-center justify-center">
        <Briefcase size={20} color="#10b981" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-slate-800">{item.full_name}</Text>
        <Text className="text-[10px] text-muted-foreground">{item.email}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Teachers</Text>
      </View>

      <View className="p-4 bg-white border-b border-border">
        <View className="relative">
          <View className="absolute left-3 top-3.5 z-10">
            <Search size={16} color="#94a3b8" />
          </View>
          <Input 
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 h-11"
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" className="mt-20" />
      ) : (
        <FlatList
          data={teachers}
          renderItem={renderTeacher}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <Text className="text-muted-foreground italic">No teachers found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
