import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface FinanceRecord {
  id: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date: string;
  term?: string;
  academic_year?: string;
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

export default function SchoolAdminFinanceScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const fetchWithAuth = async (endpoint: string) => {
    const token = session?.access_token;
    if (!token) throw new Error('No session');

    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, recordsData] = await Promise.all([
        fetchWithAuth('/api/school/finance/stats'),
        fetchWithAuth('/api/school/finance?limit=100')
      ]);

      setStats(statsData);
      setRecords(recordsData.data || []);
    } catch (error: any) {
      console.error('Error fetching finance data:', error);
      Alert.alert('Error', 'Failed to fetch financial details from server.');
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

  const filteredRecords = records.filter(rec => {
    if (filterType === 'all') return true;
    return rec.type === filterType;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">School Finances</Text>
      </View>

      <ScrollView 
        className="flex-1 p-5" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="space-y-6 mb-20">
          
          {/* Net Balance Card */}
          {stats && (
            <Card className="bg-slate-900 border-none shadow-lg overflow-hidden">
              <CardContent className="p-6">
                <Text className="text-white/60 text-xs font-bold uppercase tracking-wider">Net Surplus / Income</Text>
                <Text className={`text-3xl font-black mt-1 ${stats.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ZMW {stats.netIncome.toFixed(2)}
                </Text>
                <View className="h-px bg-white/10 my-4" />
                <View className="flex-row justify-between">
                  <View>
                    <Text className="text-white/40 text-[9px] font-bold uppercase">Total Revenue</Text>
                    <Text className="text-emerald-400 font-extrabold text-sm mt-0.5">ZMW {stats.totalRevenue.toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text className="text-white/40 text-[9px] font-bold uppercase">Total Expenses</Text>
                    <Text className="text-rose-400 font-extrabold text-sm mt-0.5">ZMW {stats.totalExpenses.toFixed(2)}</Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          )}

          {/* Monthly Performance Row */}
          {stats && (
            <View className="flex-row gap-4">
              <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                <CardContent className="p-4 items-center">
                  <TrendingUp size={24} color="#10b981" className="mb-1" />
                  <Text className="text-base font-black text-slate-900">ZMW {stats.monthlyRevenue.toFixed(0)}</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">This Month's Inflow</Text>
                </CardContent>
              </Card>

              <Card className="flex-1 bg-white border-slate-100 shadow-sm">
                <CardContent className="p-4 items-center">
                  <TrendingDown size={24} color="#ef4444" className="mb-1" />
                  <Text className="text-base font-black text-slate-900">ZMW {stats.monthlyExpenses.toFixed(0)}</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">This Month's Outflow</Text>
                </CardContent>
              </Card>
            </View>
          )}

          {/* Filter Row */}
          <View className="flex-row justify-between items-center bg-white border border-slate-100 rounded-2xl p-2.5 shadow-sm">
            <View className="flex-row items-center gap-1.5 pl-1.5">
              <Filter size={16} color="#64748b" />
              <Text className="text-xs font-extrabold text-slate-500">Filter Ledger</Text>
            </View>
            <View className="flex-row gap-2">
              {(['all', 'income', 'expense'] as const).map(t => (
                <TouchableOpacity 
                  key={t}
                  onPress={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full border ${filterType === t ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                >
                  <Text className={`text-[10px] font-extrabold uppercase ${filterType === t ? 'text-white' : 'text-slate-500'}`}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ledger / Transactions List */}
          <View>
            <Text className="text-base font-extrabold text-slate-800 mb-3">Finance Ledger Logs</Text>
            <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {filteredRecords.length > 0 ? (
                  <View className="divide-y divide-slate-50">
                    {filteredRecords.map((record) => {
                      const isIncome = record.type === 'income';
                      return (
                        <View key={record.id} className="p-4 flex-row justify-between items-center">
                          <View className="flex-1 mr-4">
                            <View className="flex-row items-center gap-2">
                              <Text className="font-extrabold text-slate-800 text-sm">{record.category}</Text>
                              <View className={`px-2 py-0.5 rounded ${isIncome ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                <Text className={`text-[8px] font-black uppercase ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                                  {record.type}
                                </Text>
                              </View>
                            </View>
                            {record.description ? (
                              <Text className="text-xs text-slate-400 mt-1 leading-relaxed">{record.description}</Text>
                            ) : null}
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">
                              {new Date(record.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              {record.term ? ` • ${record.term}` : ''}
                            </Text>
                          </View>
                          <Text className={`font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isIncome ? '+' : '-'} ZMW {Number(record.amount).toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="py-12 items-center">
                    <Wallet size={36} color="#cbd5e1" className="mb-2" />
                    <Text className="text-slate-400 italic text-xs">No records found matching filter.</Text>
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
