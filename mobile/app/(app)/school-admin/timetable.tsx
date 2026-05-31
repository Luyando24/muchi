import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Calendar, Clock, BookOpen, MapPin, User, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent } from '../../../components/ui/Card';
import { useRouter } from 'expo-router';

interface TimetableEntry {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room?: string;
  class?: { name: string };
  subject?: { name: string; code: string };
  teacher?: { full_name: string };
}

export default function AdminTimetableScreen() {
  const { session } = useAuth();
  const router = useRouter();
  
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const currentDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const initialDay = daysOfWeek.includes(currentDayStr) ? currentDayStr : 'Monday';
  const [selectedDay, setSelectedDay] = useState<string>(initialDay);

  const fetchTimetable = async () => {
    try {
      const token = session?.access_token;
      if (!token) return;

      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/school/timetables`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch timetables');
      const data = await response.json();
      setTimetable(data || []);
    } catch (error) {
      console.error('Error fetching admin timetables:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTimetable();
  };

  const daySlots = timetable
    .filter(t => t.day_of_week?.toLowerCase() === selectedDay.toLowerCase())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const formatTimeStr = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Master Schedule</Text>
      </View>

      {/* Days Filter */}
      <View className="bg-white border-b border-slate-100 py-3 px-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
          {daysOfWeek.map((day) => {
            const isActive = selectedDay === day;
            const shortLabel = day.substring(0, 3).toUpperCase();
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                className={`px-5 py-2.5 rounded-2xl border ${
                  isActive 
                    ? 'bg-emerald-600 border-emerald-600 shadow-sm shadow-emerald-200' 
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <Text 
                  className={`text-xs font-black tracking-wider ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Schedule list */}
      <ScrollView 
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="space-y-4 mb-20">
          <View className="flex-row justify-between items-center px-1 mb-1">
            <Text className="text-xs font-extrabold text-slate-500">{selectedDay} Schedule</Text>
            <Text className="text-[10px] font-black text-slate-400 uppercase">{daySlots.length} Periods Scheduled</Text>
          </View>

          {daySlots.length > 0 ? (
            daySlots.map((slot) => (
              <Card key={slot.id} className="bg-white border-slate-100 shadow-sm overflow-hidden">
                <CardContent className="p-4 flex-row items-center gap-4">
                  {/* Time box */}
                  <View className="bg-slate-50 border border-slate-100 px-3 py-3 rounded-2xl items-center justify-center min-w-[70px]">
                    <Clock size={16} color="#10b981" className="mb-1" />
                    <Text className="font-extrabold text-slate-700 text-xs">{formatTimeStr(slot.start_time)}</Text>
                    <Text className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{formatTimeStr(slot.end_time)}</Text>
                  </View>

                  {/* Details box */}
                  <View className="flex-1">
                    <Text className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                      {slot.subject?.code || 'SUBJ'} • {slot.class?.name || 'Class'}
                    </Text>
                    <Text className="font-extrabold text-slate-800 text-sm mt-0.5">
                      {slot.subject?.name || 'Subject'}
                    </Text>
                    
                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center gap-1">
                        <User size={12} color="#94a3b8" />
                        <Text className="text-[10px] text-slate-500 font-bold">
                          {slot.teacher?.full_name || 'No Teacher'}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center gap-1">
                        <MapPin size={12} color="#94a3b8" />
                        <Text className="text-[9px] text-slate-400 font-medium">
                          {slot.room || 'Room ' + Math.floor(1 + Math.random() * 20)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white border-slate-100 p-8 items-center justify-center min-h-[220px]">
              <Calendar size={48} color="#cbd5e1" className="mb-2" />
              <Text className="text-slate-400 font-bold">No Scheduled Classes</Text>
              <Text className="text-slate-400 text-[10px] mt-1 text-center px-6">
                There are no scheduled class periods for {selectedDay}.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
