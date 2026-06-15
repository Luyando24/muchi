import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { ArrowLeft, Building, Users, Bed, Check, X, ShieldAlert } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';

interface AccommodationStats {
  totalBoarders: number;
  totalCapacity: number;
  occupiedBeds: number;
  vacantBeds: number;
  shortage: number;
  shortageSeverity: 'Critical' | 'Warning' | 'Stable';
}

interface BoardingApplication {
  id: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Waitlisted' | 'Rejected';
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    gender?: string;
    grade?: string;
  };
  preferred_block?: {
    name: string;
  };
}

export default function SchoolAdminAccommodationScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AccommodationStats | null>(null);
  const [applications, setApplications] = useState<BoardingApplication[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `API error: ${response.status}`);
    }

    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, appsData] = await Promise.all([
        fetchWithAuth('/api/school/accommodation/stats'),
        fetchWithAuth('/api/school/accommodation/applications')
      ]);

      setStats(statsData);
      setApplications(appsData || []);
    } catch (error: any) {
      console.error('Error fetching accommodation details:', error);
      Alert.alert('Error', 'Failed to fetch accommodation details from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateStatus = async (appId: string, newStatus: 'Approved' | 'Rejected') => {
    setUpdatingId(appId);
    try {
      await fetchWithAuth(`/api/school/accommodation/applications/${appId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      Alert.alert('Success', `Application ${newStatus.toLowerCase()} successfully.`);
      // Reload details
      const [statsData, appsData] = await Promise.all([
        fetchWithAuth('/api/school/accommodation/stats'),
        fetchWithAuth('/api/school/accommodation/applications')
      ]);
      setStats(statsData);
      setApplications(appsData || []);
    } catch (error: any) {
      console.error('Error updating application:', error);
      Alert.alert('Error', error.message || 'Failed to update application status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  const pendingApps = applications.filter(a => a.status === 'Pending');
  const pastApps = applications.filter(a => a.status !== 'Pending');

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Accommodation Setup</Text>
      </View>

      <ScrollView 
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="space-y-6 mb-20">
          
          {/* Stats Overview */}
          {stats && (
            <View className="space-y-4">
              <View className="flex-row gap-4">
                <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <Building size={24} color="#4f46e5" className="mb-1" />
                    <Text className="text-xl font-black text-slate-900">{stats.occupiedBeds} / {stats.totalCapacity}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Beds Occupancy</Text>
                  </CardContent>
                </Card>

                <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <Bed size={24} color="#10b981" className="mb-1" />
                    <Text className="text-xl font-black text-slate-900">{stats.vacantBeds}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Vacant Beds</Text>
                  </CardContent>
                </Card>
              </View>

              {stats.shortage > 0 && (
                <Card className={`border-none shadow-sm ${stats.shortageSeverity === 'Critical' ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <CardContent className="p-4 flex-row items-center gap-3">
                    <ShieldAlert size={24} color={stats.shortageSeverity === 'Critical' ? '#ef4444' : '#f59e0b'} />
                    <View className="flex-1">
                      <Text className={`font-extrabold text-sm ${stats.shortageSeverity === 'Critical' ? 'text-rose-900' : 'text-amber-900'}`}>
                        Accommodation Shortage Alert
                      </Text>
                      <Text className={`text-xs mt-0.5 ${stats.shortageSeverity === 'Critical' ? 'text-rose-700' : 'text-amber-700'}`}>
                        The school has a shortage of {stats.shortage} beds relative to boarding demand.
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              )}
            </View>
          )}

          {/* Pending Applications Section */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Pending Boarding Requests ({pendingApps.length})</Text>
            {pendingApps.length > 0 ? (
              <View className="space-y-4">
                {pendingApps.map(app => (
                  <Card key={app.id} className="bg-white border-slate-100 shadow-sm overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <View className="flex-row justify-between items-start">
                        <View>
                          <Text className="font-extrabold text-slate-800 text-sm">{app.student?.full_name}</Text>
                          <Text className="text-xs text-slate-400 mt-0.5">{app.student?.grade} • {app.student?.gender}</Text>
                        </View>
                        <View className="bg-amber-50 px-2 py-0.5 rounded">
                          <Text className="text-[8px] font-black text-amber-700 uppercase">Pending</Text>
                        </View>
                      </View>

                      <View className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <Text className="text-[9px] text-slate-400 font-bold uppercase">Hostel Preference</Text>
                        <Text className="font-extrabold text-slate-700 text-xs mt-0.5">
                          {app.preferred_block?.name || 'Any Available Block'}
                        </Text>
                        {app.notes ? (
                          <Text className="text-xs text-slate-500 italic mt-2">"{app.notes}"</Text>
                        ) : null}
                      </View>

                      {/* Action buttons */}
                      <View className="flex-row gap-3 pt-1">
                        <TouchableOpacity 
                          disabled={updatingId !== null}
                          onPress={() => handleUpdateStatus(app.id, 'Approved')}
                          className="flex-1 bg-indigo-600 h-9 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
                        >
                          {updatingId === app.id ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <>
                              <Check size={14} color="white" />
                              <Text className="text-white font-extrabold text-xs uppercase">Approve</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                          disabled={updatingId !== null}
                          onPress={() => handleUpdateStatus(app.id, 'Rejected')}
                          className="flex-1 bg-white border border-slate-200 h-9 rounded-xl flex-row items-center justify-center gap-1.5 shadow-sm"
                        >
                          <X size={14} color="#ef4444" />
                          <Text className="text-rose-600 font-extrabold text-xs uppercase">Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="bg-white border-slate-100 shadow-sm p-6 items-center">
                <Text className="text-slate-400 italic text-xs">No pending accommodation requests.</Text>
              </Card>
            )}
          </View>

          {/* Past Decisions Section */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Decision History</Text>
            <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {pastApps.length > 0 ? (
                  <View className="divide-y divide-slate-50">
                    {pastApps.map(app => {
                      const isApproved = app.status === 'Approved';
                      return (
                        <View key={app.id} className="p-4 flex-row justify-between items-center">
                          <View>
                            <Text className="font-extrabold text-slate-800 text-sm">{app.student?.full_name}</Text>
                            <Text className="text-xs text-slate-400 mt-0.5">{app.student?.grade} • {app.student?.gender}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                              Applied: {new Date(app.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded ${isApproved ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <Text className={`text-[9px] font-bold uppercase ${isApproved ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {app.status}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="py-8 items-center">
                    <Users size={36} color="#cbd5e1" className="mb-2" />
                    <Text className="text-slate-400 italic text-xs">No past requests recorded.</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
