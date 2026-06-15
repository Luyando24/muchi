import React, { useState, useEffect } from 'react';
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

  // Loading states
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [disabilityStatus, setDisabilityStatus] = useState('');
  const [employmentDate, setEmploymentDate] = useState('');
  const [department, setDepartment] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [housingStatus, setHousingStatus] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [completionYear, setCompletionYear] = useState('');

  // Password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification states (mock)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone_number || '');
        setAddress(data.address || '');
        setGender(data.gender || '');
        setDob(data.date_of_birth || '');
        setMaritalStatus(data.marital_status || '');
        setDisabilityStatus(data.disability_status || '');
        setEmploymentDate(data.employment_date || '');
        setDepartment(data.department || '');
        setCurrentRole(data.current_role || '');
        setHousingStatus(data.housing_status || '');
        setHighestQualification(data.highest_qualification || '');
        setInstitutionName(data.institution_name || '');
        setFieldOfStudy(data.field_of_study || '');
        setCompletionYear(data.completion_year ? String(data.completion_year) : '');
      }
    } catch (error: any) {
      console.error('Error fetching profile settings:', error);
      Alert.alert('Error', 'Failed to fetch profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phone,
          address: address,
          gender: gender,
          date_of_birth: dob || null,
          marital_status: maritalStatus,
          disability_status: disabilityStatus,
          employment_date: employmentDate || null,
          department: department,
          current_role: currentRole,
          housing_status: housingStatus,
          highest_qualification: highestQualification,
          institution_name: institutionName,
          field_of_study: fieldOfStudy,
          completion_year: completionYear ? parseInt(completionYear, 10) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      Alert.alert('Success', 'Profile settings updated successfully!');
      fetchProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile settings.');
    } finally {
      setUpdating(false);
    }
  };

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

  if (loading) {
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
        <Text className="text-xl font-extrabold text-slate-900">Settings</Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="space-y-6 mb-20">
          
          {/* Profile Details Section */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="flex-row items-center gap-2 border-b border-slate-50 pb-3 mb-3">
              <Settings size={18} color="#4f46e5" />
              <CardTitle className="text-sm font-extrabold text-slate-800">Demographic & Professional Info</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Personal Details</Text>
              <Input 
                label="Full Name"
                placeholder="e.g. John Doe"
                value={fullName}
                onChangeText={setFullName}
              />
              <Input 
                label="Phone Number"
                placeholder="e.g. +260971234567"
                value={phone}
                onChangeText={setPhone}
              />
              <Input 
                label="Residential Address"
                placeholder="e.g. 123 Lusaka Rd"
                value={address}
                onChangeText={setAddress}
              />
              
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 mb-1.5">Gender</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                    {['Male', 'Female'].map(g => (
                      <TouchableOpacity 
                        key={g}
                        onPress={() => setGender(g)}
                        className={`px-4 py-2 rounded-full border ${gender === g ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                      >
                        <Text className={`text-xs font-extrabold ${gender === g ? 'text-white' : 'text-slate-600'}`}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 mb-1.5">Marital Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                    {['Single', 'Married', 'Divorced', 'Widowed'].map(m => (
                      <TouchableOpacity 
                        key={m}
                        onPress={() => setMaritalStatus(m)}
                        className={`px-4 py-2 rounded-full border ${maritalStatus === m ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                      >
                        <Text className={`text-xs font-extrabold ${maritalStatus === m ? 'text-white' : 'text-slate-600'}`}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="flex-row gap-4 mt-2">
                <View className="flex-1">
                  <Input 
                    label="Date of Birth"
                    placeholder="YYYY-MM-DD"
                    value={dob}
                    onChangeText={setDob}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 mb-1.5">Disability Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                    {['None', 'Yes'].map(d => (
                      <TouchableOpacity 
                        key={d}
                        onPress={() => setDisabilityStatus(d)}
                        className={`px-4 py-2 rounded-full border ${disabilityStatus === d ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                      >
                        <Text className={`text-xs font-extrabold ${disabilityStatus === d ? 'text-white' : 'text-slate-600'}`}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="h-px bg-slate-100 my-2" />
              <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Employment Details</Text>
              
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Input 
                    label="Employment Date"
                    placeholder="YYYY-MM-DD"
                    value={employmentDate}
                    onChangeText={setEmploymentDate}
                  />
                </View>
                <View className="flex-1">
                  <Input 
                    label="Department"
                    placeholder="e.g. Science"
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>
              </View>

              <View className="flex-row gap-4 mt-2">
                <View className="flex-1">
                  <Input 
                    label="Current Role"
                    placeholder="e.g. Teacher"
                    value={currentRole}
                    onChangeText={setCurrentRole}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 mb-1.5">Housing Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                    {['Off-Campus', 'On-Campus'].map(h => (
                      <TouchableOpacity 
                        key={h}
                        onPress={() => setHousingStatus(h)}
                        className={`px-4 py-2 rounded-full border ${housingStatus === h ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}
                      >
                        <Text className={`text-xs font-extrabold ${housingStatus === h ? 'text-white' : 'text-slate-600'}`}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View className="h-px bg-slate-100 my-2" />
              <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Qualifications & Education</Text>

              <Input 
                label="Highest Qualification"
                placeholder="e.g. Bachelor of Education"
                value={highestQualification}
                onChangeText={setHighestQualification}
              />
              <Input 
                label="Institution Name"
                placeholder="e.g. University of Zambia"
                value={institutionName}
                onChangeText={setInstitutionName}
              />
              
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Input 
                    label="Field of Study"
                    placeholder="e.g. Mathematics"
                    value={fieldOfStudy}
                    onChangeText={setFieldOfStudy}
                  />
                </View>
                <View className="flex-1">
                  <Input 
                    label="Completion Year"
                    placeholder="e.g. 2018"
                    keyboardType="numeric"
                    value={completionYear}
                    onChangeText={setCompletionYear}
                  />
                </View>
              </View>

              <Button 
                title="Save Profile Details"
                onPress={handleUpdateProfile}
                loading={updating}
                className="bg-indigo-600 h-11 mt-4"
              />
            </CardContent>
          </Card>

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
