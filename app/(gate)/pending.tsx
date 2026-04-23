import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '@/src/firebase/config';

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
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall">Pending review</Text>
          <Text>
            Your account is awaiting admin approval. You&apos;ll be notified when you&apos;re let
            in. Pull down to check for updates.
          </Text>
        </Card.Content>
      </Card>
      <Button onPress={() => signOut(auth)}>Sign out</Button>
    </ScrollView>
  );
}
