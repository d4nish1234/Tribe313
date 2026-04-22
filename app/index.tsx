import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function Index() {
  const { loading, firebaseUser, appUser } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!firebaseUser) return <Redirect href="/login" />;
  if (!firebaseUser.emailVerified) return <Redirect href="/verify" />;
  if (!appUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (appUser.status === 'pending') return <Redirect href="/pending" />;
  if (appUser.status === 'evicted') return <Redirect href="/evicted" />;
  return <Redirect href="/(tabs)" />;
}
