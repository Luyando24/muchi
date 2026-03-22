import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../../hooks/useAuth';
import { Card, CardContent } from '../../../../components/ui/Card';
import { ArrowLeft, Users, ChevronRight, ClipboardList } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SchoolClass {
  id: string;
  name: string;
  section: string;
  student_count: number;
}

export default function ClassesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) return;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch classes');
      const data = await response.json();
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
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
      <View className="px-5 py-4 border-b border-slate-100 bg-white">
        <Text className="text-xl font-extrabold text-slate-900">My Classes</Text>
      </View>
 
      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {classes.length > 0 ? (
          <View className="space-y-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="bg-white border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="font-extrabold text-slate-800 text-lg">{cls.name}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Users size={14} color="#64748b" />
                        <Text className="text-xs text-slate-500 font-medium">{cls.student_count} Students enrolled</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      className="bg-indigo-600 px-4 py-2.5 rounded-xl flex-row items-center gap-2 shadow-sm"
                      onPress={() => router.push({
                        pathname: '/(app)/teacher/mark-attendance',
                        params: { classId: cls.id }
                      })}
                    >
                      <ClipboardList size={14} color="white" />
                      <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Attendance</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Progress simulator mimic */}
                  <View className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <View className="h-full bg-indigo-200 w-1/3 rounded-full" />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <View className="py-20 items-center">
            <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center mb-4">
               <Users size={32} color="#cbd5e1" />
            </View>
            <Text className="text-slate-400 font-bold">No Classes Assigned</Text>
            <Text className="text-slate-400 text-[10px] mt-1 italic">You are not currently assigned to any classes.</Text>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
