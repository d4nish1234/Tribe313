import { useState } from 'react';
import { Button, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';

export default function Pending() {
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await auth.currentUser?.reload();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AuthScreen
      title="Pending review"
      refreshing={refreshing}
      onRefresh={onRefresh}
      footer={
        <Button onPress={() => signOut(auth)} textColor="#FFFFFF">
          Sign out
        </Button>
      }
    >
      <Text>
        Your account is awaiting admin approval. You&apos;ll be notified when you&apos;re let in. Pull down to check
        for updates.
      </Text>
    </AuthScreen>
  );
}
