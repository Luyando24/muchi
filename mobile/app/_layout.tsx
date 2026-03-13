import '../global.css';
import 'react-native-reanimated';
import 'react-native-gesture-handler';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

function RootLayoutNav() {
  const { session, role, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      // Redirect to login if not authenticated
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (session && inAuthGroup) {
      // Redirect to appropriate portal based on role
      if (role === 'student') {
        router.replace('/(app)/student');
      } else if (role === 'teacher') {
        router.replace('/(app)/teacher');
      } else if (role === 'school_admin') {
        router.replace('/(app)/school-admin');
      } else {
        // System admin not supported on mobile for now as per instructions
        router.replace('/(auth)/login');
      }
    }
  }, [session, role, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
