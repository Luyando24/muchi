import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { ArrowLeft, Coffee, Clipboard, Package, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  updated_at: string;
}

interface MealRecord {
  id: string;
  date: string;
  meal_type: string;
  beneficiaries_count: number;
  items_used?: Array<{ item_id: string; item_name: string; quantity: number; unit: string }>;
}

interface DeliveryRecord {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  delivery_date: string;
  status: 'Pending' | 'Received';
  received_by?: {
    full_name: string;
  };
}

export default function SchoolAdminFeedingProgramScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'meals' | 'deliveries'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [receivingId, setReceivingId] = useState<string | null>(null);

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
      const [inventoryData, mealsData, deliveriesData] = await Promise.all([
        fetchWithAuth('/api/school/feeding-program/inventory'),
        fetchWithAuth('/api/school/feeding-program/meals'),
        fetchWithAuth('/api/school/feeding-program/deliveries')
      ]);

      setInventory(inventoryData || []);
      setMeals(mealsData || []);
      setDeliveries(deliveriesData || []);
    } catch (error: any) {
      console.error('Error fetching feeding program data:', error);
      Alert.alert('Error', 'Failed to fetch feeding program data.');
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

  const handleReceiveDelivery = async (deliveryId: string) => {
    setReceivingId(deliveryId);
    try {
      await fetchWithAuth(`/api/school/feeding-program/deliveries/${deliveryId}/receive`, {
        method: 'POST'
      });
      Alert.alert('Success', 'Delivery received and inventory updated successfully!');
      
      // Reload data
      const [inventoryData, mealsData, deliveriesData] = await Promise.all([
        fetchWithAuth('/api/school/feeding-program/inventory'),
        fetchWithAuth('/api/school/feeding-program/meals'),
        fetchWithAuth('/api/school/feeding-program/deliveries')
      ]);
      setInventory(inventoryData || []);
      setMeals(mealsData || []);
      setDeliveries(deliveriesData || []);
    } catch (error: any) {
      console.error('Error receiving delivery:', error);
      Alert.alert('Error', error.message || 'Failed to receive delivery.');
    } finally {
      setReceivingId(null);
    }
  };

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
        <Text className="text-xl font-extrabold text-slate-900">Feeding Program</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-slate-100 px-2 py-1">
        {(['inventory', 'meals', 'deliveries'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            className="flex-1 py-3 items-center"
          >
            <Text className={`text-xs font-black uppercase tracking-wider ${activeTab === t ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
              {t === 'meals' ? 'Meal Logs' : t}
            </Text>
            {activeTab === t && <View className="h-0.5 w-8 bg-indigo-600 rounded-full mt-1.5" />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        className="flex-1 p-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="space-y-6 mb-20">
          
          {/* Quick Stats Overview */}
          <View className="flex-row gap-4">
            <Card className="flex-1 bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 items-center">
                <Package size={24} color="#4f46e5" className="mb-1" />
                <Text className="text-lg font-black text-slate-900">{inventory.length}</Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Stock Items</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 items-center">
                <Coffee size={24} color="#10b981" className="mb-1" />
                <Text className="text-lg font-black text-slate-900">{meals.length}</Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Meals Logged</Text>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 items-center">
                <Clipboard size={24} color="#f59e0b" className="mb-1" />
                <Text className="text-lg font-black text-slate-900">
                  {deliveries.filter(d => d.status === 'Pending').length}
                </Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Open Deliveries</Text>
              </CardContent>
            </Card>
          </View>

          {/* ==================== TAB 1: INVENTORY ==================== */}
          {activeTab === 'inventory' && (
            <View className="space-y-4">
              <Text className="text-base font-extrabold text-slate-800 mb-1">Ingredient Inventory</Text>
              {inventory.length > 0 ? (
                inventory.map(item => {
                  const isLow = item.quantity <= 5; // Simple threshold
                  return (
                    <Card key={item.id} className="bg-white border-slate-100 shadow-sm">
                      <CardContent className="p-4 flex-row justify-between items-center">
                        <View>
                          <Text className="font-extrabold text-slate-800 text-sm">{item.item_name}</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                            Last Updated: {new Date(item.updated_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View className={`px-3 py-1 rounded-full ${isLow ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
                          <Text className={`text-xs font-black ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>
                            {item.quantity} {item.unit}
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="bg-white border-slate-100 p-8 items-center">
                  <Text className="text-slate-400 italic text-xs">No food stock in inventory.</Text>
                </Card>
              )}
            </View>
          )}

          {/* ==================== TAB 2: MEAL LOGS ==================== */}
          {activeTab === 'meals' && (
            <View className="space-y-4">
              <Text className="text-base font-extrabold text-slate-800 mb-1">Feeding Meal History</Text>
              {meals.length > 0 ? (
                meals.map(meal => (
                  <Card key={meal.id} className="bg-white border-slate-100 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <View className="flex-row justify-between items-start">
                        <View>
                          <Text className="font-extrabold text-slate-800 text-sm">{meal.meal_type}</Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {new Date(meal.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <View className="bg-indigo-50 px-2.5 py-0.5 rounded">
                          <Text className="text-[10px] font-black text-indigo-700">{meal.beneficiaries_count} Served</Text>
                        </View>
                      </View>

                      {/* Items used */}
                      {meal.items_used && meal.items_used.length > 0 && (
                        <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                          <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ingredients Used</Text>
                          {meal.items_used.map((item, idx) => (
                            <Text key={idx} className="text-xs text-slate-600 font-semibold">
                              • {item.item_name || 'Ingredient'}: {item.quantity} {item.unit}
                            </Text>
                          ))}
                        </View>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-white border-slate-100 p-8 items-center">
                  <Text className="text-slate-400 italic text-xs">No daily meals logged yet.</Text>
                </Card>
              )}
            </View>
          )}

          {/* ==================== TAB 3: DELIVERIES ==================== */}
          {activeTab === 'deliveries' && (
            <View className="space-y-4">
              <Text className="text-base font-extrabold text-slate-800 mb-1">Food Deliveries</Text>
              {deliveries.length > 0 ? (
                deliveries.map(del => {
                  const isPending = del.status === 'Pending';
                  return (
                    <Card key={del.id} className="bg-white border-slate-100 shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <View className="flex-row justify-between items-start">
                          <View>
                            <Text className="font-extrabold text-slate-800 text-sm">{del.item_name}</Text>
                            <Text className="text-xs text-slate-500 font-bold mt-0.5">{del.quantity} {del.unit}</Text>
                            <Text className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                              Delivery Date: {new Date(del.delivery_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View className={`px-2 py-0.5 rounded ${isPending ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                            <Text className={`text-[10px] font-black uppercase ${isPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {del.status}
                            </Text>
                          </View>
                        </View>

                        {isPending ? (
                          <TouchableOpacity 
                            disabled={receivingId !== null}
                            onPress={() => handleReceiveDelivery(del.id)}
                            className="bg-indigo-600 h-9 rounded-xl flex-row items-center justify-center gap-1.5 mt-1 shadow-sm"
                          >
                            {receivingId === del.id ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <>
                                <CheckCircle2 size={14} color="white" />
                                <Text className="text-white font-extrabold text-xs uppercase">Confirm Receipt</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        ) : (
                          del.received_by?.full_name ? (
                            <View className="flex-row items-center gap-1.5 mt-1">
                              <CheckCircle2 size={14} color="#10b981" />
                              <Text className="text-[10px] text-slate-400 font-semibold">
                                Received by {del.received_by.full_name}
                              </Text>
                            </View>
                          ) : null
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="bg-white border-slate-100 p-8 items-center">
                  <Text className="text-slate-400 italic text-xs">No food deliveries recorded.</Text>
                </Card>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
