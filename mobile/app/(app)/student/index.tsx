import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ActivityIndicator } from 'react-native';

interface StudentProfile {
  full_name: string;
  student_number: string;
  grade: string;
  avatar_url?: string;
}

interface GradeSummary {
  subject: string;
  score: number;
  grade: string;
}

export default function StudentDashboard() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentGrades, setRecentGrades] = useState<GradeSummary[]>([]);

  const fetchStudentData = async () => {
    try {
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Mock grades for now since we don't have full grade structure confirmed
      // In a real app, fetch from 'grades' table joined with 'subjects'
      setRecentGrades([
        { subject: 'Mathematics', score: 85, grade: 'A' },
        { subject: 'Science', score: 78, grade: 'B' },
        { subject: 'English', score: 92, grade: 'A*' },
      ]);

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentData();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        className="flex-1 p-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-primary mb-1">Student Portal</Text>
          <Text className="text-lg text-muted-foreground">
            Welcome back, {profile?.full_name || user?.email}
          </Text>
        </View>

        <View className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Student Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">Student ID:</Text>
                  <Text className="font-medium">{profile?.student_number || 'N/A'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted-foreground">Grade/Class:</Text>
                  <Text className="font-medium">{profile?.grade || 'Not Assigned'}</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Recent Grades */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {recentGrades.length > 0 ? (
                <View className="space-y-3">
                  {recentGrades.map((grade, index) => (
                    <View key={index} className="flex-row justify-between items-center border-b border-border pb-2 last:border-0">
                      <Text className="font-medium">{grade.subject}</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-muted-foreground">{grade.score}%</Text>
                        <View className="bg-primary/10 px-2 py-1 rounded">
                          <Text className="text-primary font-bold text-xs">{grade.grade}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-muted-foreground text-center py-4">No grades available yet.</Text>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <View className="gap-3">
            <Button
              title="View Full Report Card"
              variant="outline"
              onPress={() => {}} // TODO: Navigate to full report
            />
            <Button
              title="Sign Out"
              onPress={signOut}
              variant="destructive"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
