import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'student') return <Redirect href="/(app)/student" />;
  if (role === 'teacher') return <Redirect href="/(app)/teacher" />;
  if (role === 'school_admin') return <Redirect href="/(app)/school-admin" />;

  // Default fallback
  return <Redirect href="/(auth)/login" />;
}
