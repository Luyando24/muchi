import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ArrowLeft, BookOpen, Calendar, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  classes: { name: string };
  subjects: { name: string };
  type: string;
}

export default function AssignmentsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) return;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/teacher/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch assignments');
      const data = await response.json();
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
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
        <Text className="text-xl font-extrabold text-slate-900">Assignments</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        {assignments.length > 0 ? (
          <View className="space-y-4">
            {assignments.map((assignment) => (
              <TouchableOpacity 
                key={assignment.id}
                onPress={() => {/* TODO: Show submissions */}}
              >
                <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                       <View className="flex-1">
                         <Text className="font-extrabold text-slate-800 text-base">{assignment.title}</Text>
                         <Text className="text-[10px] text-slate-500 mt-1 leading-relaxed" numberOfLines={2}>
                           {assignment.description}
                         </Text>
                       </View>
                       <View className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                         <Text className="text-indigo-600 text-[10px] font-bold uppercase tracking-tighter">{assignment.type}</Text>
                       </View>
                    </View>

                    <View className="flex-row items-center gap-4 pt-3 border-t border-slate-50">
                      <View className="flex-row items-center gap-1.5">
                        <View className="bg-slate-100 p-1 rounded">
                           <BookOpen size={10} color="#64748b" />
                        </View>
                        <Text className="text-[9px] font-bold text-slate-500 uppercase">{assignment.subjects?.name}</Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="bg-slate-100 p-1 rounded">
                           <Calendar size={10} color="#64748b" />
                        </View>
                        <Text className="text-[9px] font-bold text-slate-500 uppercase">
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No date'}
                        </Text>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="py-20 items-center">
            <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center mb-4">
               <BookOpen size={32} color="#cbd5e1" />
            </View>
            <Text className="text-slate-400 font-bold">No Assignments Found</Text>
            <Text className="text-slate-400 text-[10px] mt-1 italic">Click the "+" to create your first assignment.</Text>
          </View>
        )}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
