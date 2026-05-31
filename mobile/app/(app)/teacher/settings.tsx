import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, ActivityIndicator, Alert, Switch, TouchableOpacity } from 'react-native';
import { Settings, Key, Bell, Power, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const router = useRouter();

  // Password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification states (mock)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Update Profile to clear temporary password flag if it exists
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_temp_password: false,
          temp_password_expires_at: null,
          temp_password_set_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) {
        console.error('Error clearing temp password flag:', profileError);
      }

      Alert.alert('Success', 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-100 bg-white flex-row items-center gap-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-900">Settings</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="space-y-6 mb-20">
          
          {/* Security / Password Section */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="flex-row items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Key size={18} color="#4f46e5" />
              <CardTitle className="text-sm font-extrabold text-slate-800">Update Portal Password</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Input 
                placeholder="New secure password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <Input 
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <Button 
                title="Change Password"
                onPress={handlePasswordUpdate}
                loading={passwordLoading}
                className="bg-indigo-600 h-11 mt-2"
              />
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="flex-row items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Bell size={18} color="#10b981" />
              <CardTitle className="text-sm font-extrabold text-slate-800">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="font-extrabold text-slate-700 text-sm">Push Notifications</Text>
                  <Text className="text-[10px] text-slate-400 font-medium">Receive direct alerts for submissions</Text>
                </View>
                <Switch value={pushEnabled} onValueChange={setPushEnabled} />
              </View>
              
              <View className="h-px bg-slate-50" />

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="font-extrabold text-slate-700 text-sm">Email Alerts</Text>
                  <Text className="text-[10px] text-slate-400 font-medium">Receive system summaries by email</Text>
                </View>
                <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
              </View>
            </CardContent>
          </Card>

          {/* Sign Out Section */}
          <TouchableOpacity 
            onPress={signOut}
            className="bg-white p-4 rounded-xl flex-row items-center justify-center gap-2 border border-rose-100 shadow-sm"
          >
            <Power size={18} color="#ef4444" />
            <Text className="text-rose-600 font-black uppercase text-xs tracking-wider">Sign Out Portal</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
