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

      const response = await fetch('/api/teacher/assignments', {
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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4 flex-row items-center gap-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Assignments</Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {assignments.length > 0 ? (
          <View className="space-y-4">
            {assignments.map((assignment) => (
              <TouchableOpacity 
                key={assignment.id}
                onPress={() => {/* TODO: Show submissions */}}
              >
                <Card>
                  <CardContent className="p-4">
                    <View className="flex-row justify-between items-start mb-2">
                       <View className="flex-1">
                         <Text className="font-bold text-base">{assignment.title}</Text>
                         <Text className="text-xs text-muted-foreground mt-1" numberOfLines={2}>
                           {assignment.description}
                         </Text>
                       </View>
                       <View className="bg-indigo-100 px-2 py-0.5 rounded">
                         <Text className="text-indigo-600 text-[10px] font-bold uppercase">{assignment.type}</Text>
                       </View>
                    </View>

                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center gap-1">
                        <BookOpen size={14} color="#64748b" />
                        <Text className="text-[10px] text-slate-500">{assignment.subjects?.name} - {assignment.classes?.name}</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Calendar size={14} color="#64748b" />
                        <Text className="text-[10px] text-slate-500">
                          Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No date'}
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
            <BookOpen size={48} color="#cbd5e1" />
            <Text className="text-muted-foreground mt-4">No assignments found.</Text>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
