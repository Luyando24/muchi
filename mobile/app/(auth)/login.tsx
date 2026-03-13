import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email/student number and password');
      return;
    }

    setLoading(true);
    try {
      let emailToUse = email;
      
      // If it doesn't look like an email, try to look it up as a student number
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const { data: lookedUpEmail, error: lookupError } = await supabase.rpc('get_email_by_student_number', {
          p_student_number: email
        });
        
        if (lookupError) {
           throw new Error("Error verifying student number");
        }
        
        if (!lookedUpEmail) {
          throw new Error("Student number not found");
        }
        emailToUse = lookedUpEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Auth listener in _layout.tsx will handle redirection based on role
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">
        <View className="flex-1 justify-center">
          <View className="mb-12 items-center">
            <Text className="text-4xl font-bold text-primary mb-2">FLOVA</Text>
            <Text className="text-lg text-muted-foreground">School Management System</Text>
          </View>

          <View className="space-y-4">
            <Text className="text-2xl font-semibold text-foreground mb-6">Login</Text>
            
            <Input
              label="Email or Student Number"
              placeholder="Enter your email or student number"
              value={email}
              onChangeText={setEmail}
              keyboardType="default"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              className="mt-4"
            />
            
            <View className="mt-8 flex-row justify-center">
              <Text className="text-muted-foreground">Need help? </Text>
              <Text className="text-primary font-semibold">Contact Administrator</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
