import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Search, User, BookOpen, GraduationCap } from 'lucide-react-native';

interface TeacherProfile {
  full_name: string;
  email: string;
}

interface StudentResult {
  id: string;
  full_name: string;
  student_number: string;
  grade: string;
}

export default function TeacherDashboard() {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherProfile();
  }, [user]);

  const fetchTeacherProfile = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    
    setIsSearching(true);
    try {
      // Search by name or student number
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_number, grade')
        .eq('role', 'student')
        .or(`full_name.ilike.%${searchQuery}%,student_number.eq.${searchQuery}`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
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
      <ScrollView className="flex-1 p-6">
        <View className="mb-8 flex-row justify-between items-center">
          <View>
            <Text className="text-3xl font-bold text-primary mb-1">Teacher Portal</Text>
            <Text className="text-lg text-muted-foreground">
              Hello, {profile?.full_name || 'Teacher'}
            </Text>
          </View>
          <TouchableOpacity onPress={signOut} className="bg-destructive/10 p-2 rounded-full">
            <User size={24} color="red" />
          </TouchableOpacity>
        </View>

        <View className="space-y-6">
          {/* Search Section */}
          <Card>
            <CardHeader>
              <CardTitle>Find Student</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    placeholder="Search by name or ID..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                  />
                </View>
                <Button 
                  title={isSearching ? "..." : "Search"} 
                  onPress={handleSearch}
                  className="w-20"
                />
              </View>

              {/* Results */}
              {searchResults.length > 0 && (
                <View className="mt-4 space-y-2">
                  <Text className="text-sm font-semibold text-muted-foreground mb-2">Results:</Text>
                  {searchResults.map((student) => (
                    <TouchableOpacity 
                      key={student.id}
                      className="flex-row justify-between items-center p-3 bg-muted/20 rounded-lg border border-border"
                      onPress={() => {}} // TODO: Navigate to student details
                    >
                      <View>
                        <Text className="font-medium">{student.full_name}</Text>
                        <Text className="text-xs text-muted-foreground">ID: {student.student_number}</Text>
                      </View>
                      <View className="bg-primary/10 px-2 py-1 rounded">
                        <Text className="text-primary text-xs font-bold">{student.grade}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats / Classes */}
          <View className="flex-row gap-4">
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <BookOpen size={32} color="#4f46e5" className="mb-2" />
                <Text className="text-2xl font-bold">5</Text>
                <Text className="text-xs text-muted-foreground">Classes</Text>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="items-center py-4">
                <GraduationCap size={32} color="#4f46e5" className="mb-2" />
                <Text className="text-2xl font-bold">142</Text>
                <Text className="text-xs text-muted-foreground">Students</Text>
              </CardContent>
            </Card>
          </View>

          {/* Upcoming Classes (Mock) */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="space-y-3">
                {[
                  { time: '08:00', class: 'Grade 10A', subject: 'Mathematics' },
                  { time: '10:00', class: 'Grade 11B', subject: 'Physics' },
                  { time: '13:00', class: 'Grade 9C', subject: 'Mathematics' },
                ].map((item, i) => (
                  <View key={i} className="flex-row items-center border-l-4 border-primary pl-3 py-1">
                    <Text className="text-sm font-bold w-16 text-muted-foreground">{item.time}</Text>
                    <View>
                      <Text className="font-semibold">{item.subject}</Text>
                      <Text className="text-xs text-muted-foreground">{item.class}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
