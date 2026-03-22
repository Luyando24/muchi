import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { Card, CardContent } from '../../../components/ui/Card';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      <View className="px-5 py-4 border-b border-slate-100 bg-white">
        <Text className="text-xl font-extrabold text-slate-900">Settings</Text>
      </View>
      <ScrollView className="flex-1 p-5">
        <Card className="bg-white border-slate-100 shadow-sm min-h-[200px] justify-center items-center">
          <SettingsIcon size={48} color="#cbd5e1" />
          <Text className="text-slate-400 mt-4 font-bold">App Settings</Text>
          <Text className="text-[10px] text-slate-400 mt-1 italic text-center px-10">
            Manage your notification preferences, theme, and language.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
