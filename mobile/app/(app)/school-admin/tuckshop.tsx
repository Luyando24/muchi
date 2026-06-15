import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { ArrowLeft, ShoppingBag, Store, TrendingUp, AlertTriangle, ChevronRight, DollarSign, Package } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';

interface TuckshopAnalytics {
  totalRevenue: number;
  totalSalesCount: number;
  grossProfit: number;
  lowStockCount: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

interface TuckshopProduct {
  id: string;
  name: string;
  sku: string;
  description?: string;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  category: string;
}

interface TuckshopSale {
  id: string;
  buyer_type: string;
  buyer_name?: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product?: {
      name: string;
    };
  }>;
}

export default function SchoolAdminTuckshopScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'inventory' | 'sales'>('analytics');
  const [analytics, setAnalytics] = useState<TuckshopAnalytics | null>(null);
  const [products, setProducts] = useState<TuckshopProduct[]>([]);
  const [sales, setSales] = useState<TuckshopSale[]>([]);

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
      const [analyticsData, inventoryData, salesData] = await Promise.all([
        fetchWithAuth('/api/school/tuckshop/analytics'),
        fetchWithAuth('/api/school/tuckshop/inventory'),
        fetchWithAuth('/api/school/tuckshop/sales')
      ]);

      setAnalytics(analyticsData);
      setProducts(inventoryData || []);
      setSales(salesData || []);
    } catch (error: any) {
      console.error('Error fetching tuckshop data:', error);
      Alert.alert('Error', 'Failed to fetch tuckshop details from server.');
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
        <Text className="text-xl font-extrabold text-slate-900">Tuckshop POS</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-slate-100 px-2 py-1">
        {(['analytics', 'inventory', 'sales'] as const).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setActiveTab(t)}
            className="flex-1 py-3 items-center"
          >
            <Text className={`text-xs font-black uppercase tracking-wider ${activeTab === t ? 'text-indigo-600 font-extrabold' : 'text-slate-400'}`}>
              {t}
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
          
          {/* ==================== TAB 1: ANALYTICS ==================== */}
          {activeTab === 'analytics' && analytics && (
            <View className="space-y-6">
              {/* Gross stats */}
              <View className="flex-row flex-wrap gap-4">
                <Card className="w-[47%] bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <TrendingUp size={24} color="#4f46e5" className="mb-1" />
                    <Text className="text-base font-black text-slate-900">ZMW {analytics.totalRevenue.toFixed(0)}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Total Revenue</Text>
                  </CardContent>
                </Card>

                <Card className="w-[47%] bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <ShoppingBag size={24} color="#10b981" className="mb-1" />
                    <Text className="text-base font-black text-slate-900">ZMW {analytics.grossProfit.toFixed(0)}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Gross Profit</Text>
                  </CardContent>
                </Card>

                <Card className="w-[47%] bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <Package size={24} color="#f59e0b" className="mb-1" />
                    <Text className="text-base font-black text-slate-900">{analytics.totalSalesCount}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Total Sales</Text>
                  </CardContent>
                </Card>

                <Card className="w-[47%] bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-4 items-center">
                    <AlertTriangle size={24} color={analytics.lowStockCount > 0 ? '#ef4444' : '#cbd5e1'} className="mb-1" />
                    <Text className="text-base font-black text-slate-900">{analytics.lowStockCount}</Text>
                    <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Low Stock Items</Text>
                  </CardContent>
                </Card>
              </View>

              {/* Top Selling Products */}
              <View>
                <Text className="text-base font-extrabold text-slate-800 mb-3">Top Selling Products</Text>
                <Card className="bg-white border-slate-100 shadow-sm">
                  <CardContent className="p-0">
                    {analytics.topProducts.length > 0 ? (
                      <View className="divide-y divide-slate-50">
                        {analytics.topProducts.map((p, idx) => (
                          <View key={idx} className="p-4 flex-row justify-between items-center">
                            <View className="flex-row items-center gap-3">
                              <View className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                                <Text className="font-extrabold text-xs text-slate-500">#{idx + 1}</Text>
                              </View>
                              <View>
                                <Text className="font-extrabold text-slate-800 text-sm">{p.name}</Text>
                                <Text className="text-[10px] text-slate-400 mt-0.5">{p.quantity} items sold</Text>
                              </View>
                            </View>
                            <Text className="font-black text-slate-800 text-sm">ZMW {p.revenue.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="py-8 items-center">
                        <Text className="text-slate-400 italic text-xs">No product metrics recorded.</Text>
                      </View>
                    )}
                  </CardContent>
                </Card>
              </View>
            </View>
          )}

          {/* ==================== TAB 2: INVENTORY ==================== */}
          {activeTab === 'inventory' && (
            <View className="space-y-4">
              <Text className="text-base font-extrabold text-slate-800 mb-1">Product Inventory List</Text>
              {products.length > 0 ? (
                products.map(prod => {
                  const isLow = prod.stock_quantity <= prod.reorder_level;
                  return (
                    <Card key={prod.id} className="bg-white border-slate-100 shadow-sm">
                      <CardContent className="p-4">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-4">
                            <Text className="font-extrabold text-slate-800 text-sm">{prod.name}</Text>
                            <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{prod.sku} • {prod.category}</Text>
                          </View>
                          <Text className="font-black text-indigo-600 text-sm">ZMW {Number(prod.selling_price).toFixed(2)}</Text>
                        </View>
                        
                        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-slate-50">
                          <View className="flex-row items-center gap-1">
                            <Package size={14} color="#64748b" />
                            <Text className="text-xs text-slate-500 font-semibold">Stock Quantity:</Text>
                          </View>
                          <View className={`px-2.5 py-0.5 rounded ${isLow ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
                            <Text className={`text-xs font-black ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>
                              {prod.stock_quantity} Left
                            </Text>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card className="bg-white border-slate-100 p-8 items-center">
                  <Text className="text-slate-400 italic text-xs">No products in inventory.</Text>
                </Card>
              )}
            </View>
          )}

          {/* ==================== TAB 3: SALES ==================== */}
          {activeTab === 'sales' && (
            <View className="space-y-4">
              <Text className="text-base font-extrabold text-slate-800 mb-1">Sales Ledger</Text>
              {sales.length > 0 ? (
                sales.map(sale => (
                  <Card key={sale.id} className="bg-white border-slate-100 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <View className="flex-row justify-between items-start">
                        <View>
                          <Text className="font-extrabold text-slate-800 text-sm">
                            Buyer: {sale.buyer_name || `Anonymous (${sale.buyer_type})`}
                          </Text>
                          <Text className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {new Date(sale.created_at).toLocaleString()}
                          </Text>
                        </View>
                        <Text className="font-black text-slate-800 text-base">ZMW {Number(sale.total_amount).toFixed(2)}</Text>
                      </View>

                      {/* Items sold */}
                      {sale.items && sale.items.length > 0 && (
                        <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                          <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Items</Text>
                          {sale.items.map(item => (
                            <View key={item.id} className="flex-row justify-between items-center">
                              <Text className="text-xs text-slate-600 font-bold flex-1 mr-2" numberOfLines={1}>
                                {item.product?.name || 'Tuckshop Product'} (x{item.quantity})
                              </Text>
                              <Text className="text-xs text-slate-500 font-extrabold">
                                ZMW {Number(item.total_price).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View className="flex-row justify-between items-center pt-2 border-t border-slate-50">
                        <Text className="text-[10px] text-slate-400 font-bold uppercase">Payment Method:</Text>
                        <View className="bg-indigo-50 px-2.5 py-0.5 rounded">
                          <Text className="text-[10px] font-black text-indigo-700 uppercase">{sale.payment_method}</Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-white border-slate-100 p-8 items-center">
                  <Text className="text-slate-400 italic text-xs">No sales recorded.</Text>
                </Card>
              )}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
