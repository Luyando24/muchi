import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent } from '../../../components/ui/Card';
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

      const response = await fetch('/api/teacher/classes', {
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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">My Classes</Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {classes.length > 0 ? (
          <View className="space-y-4">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="font-bold text-lg">{cls.name}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Users size={14} color="#64748b" />
                        <Text className="text-xs text-muted-foreground">{cls.student_count} Students</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row gap-2">
                       <TouchableOpacity 
                         className="bg-indigo-600 px-4 py-2 rounded-lg flex-row items-center gap-2"
                         onPress={() => router.push({
                           pathname: '/(app)/teacher/mark-attendance',
                           params: { classId: cls.id }
                         })}
                       >
                         <ClipboardList size={16} color="white" />
                         <Text className="text-white text-xs font-bold">Attendance</Text>
                       </TouchableOpacity>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        ) : (
          <View className="py-20 items-center">
            <Users size={48} color="#cbd5e1" />
            <Text className="text-muted-foreground mt-4">You are not assigned to any classes.</Text>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
