import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { User, Mail, LogOut, ChevronRight, Settings, Bell, Shield } from 'lucide-react-native';
import { useAuth } from '../../../../hooks/useAuth';
import { Card, CardContent } from '../../../../components/ui/Card';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const MenuItem = ({ icon, label, last = false }: { icon: any, label: string, last?: boolean }) => (
    <TouchableOpacity className={`flex-row items-center justify-between py-4 ${!last ? 'border-b border-slate-50' : ''}`}>
      <View className="flex-row items-center gap-3">
        <View className="bg-slate-50 p-2 rounded-lg">{icon}</View>
        <Text className="font-bold text-slate-700">{label}</Text>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <ScrollView className="flex-1">
        <View className="bg-white px-5 pt-12 pb-8 border-b border-slate-100">
           <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-indigo-50 items-center justify-center border-4 border-white shadow-md">
                 <User size={48} color="#4f46e5" />
              </View>
           </View>
           <View className="items-center">
              <Text className="text-xl font-bold text-slate-900">{user?.email?.split('@')[0] || 'Teacher'}</Text>
              <View className="flex-row items-center gap-1 mt-1">
                 <Mail size={12} color="#64748b" />
                 <Text className="text-xs text-slate-500">{user?.email}</Text>
              </View>
              <View className="bg-indigo-600 px-3 py-1 rounded-full mt-4">
                 <Text className="text-white text-[10px] font-bold">TEACHER</Text>
              </View>
           </View>
        </View>

        <View className="p-5 space-y-6">
           <Card className="bg-white border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-0 px-4">
                 <MenuItem icon={<Settings size={18} color="#64748b" />} label="Account Settings" />
                 <MenuItem icon={<Bell size={18} color="#64748b" />} label="Notifications" />
                 <MenuItem icon={<Shield size={18} color="#64748b" />} label="Security" last />
              </CardContent>
           </Card>

           <TouchableOpacity 
             onPress={signOut}
             className="bg-white p-4 rounded-xl flex-row items-center justify-center gap-2 border border-red-100 shadow-sm"
           >
              <LogOut size={18} color="#ef4444" />
              <Text className="text-red-600 font-bold">Sign Out</Text>
           </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
