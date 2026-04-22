import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, List, Text } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { approveUser } from '@/src/firebase/fn';

export default function Approvals() {
  const { isAdmin } = useAuth();
  const { loading, members } = useMembers(true);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/" />;

  const pending = members.filter((m) => m.status === 'pending');

  async function approve(uid: string) {
    setBusy(uid);
    try {
      await approveUser({ uid });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      data={pending}
      keyExtractor={(m) => m.uid}
      ListEmptyComponent={
        <Text style={{ padding: 24, textAlign: 'center', opacity: 0.7 }}>
          No pending members.
        </Text>
      }
      renderItem={({ item }) => (
        <List.Item
          title={`${item.firstName} ${item.lastName}`}
          description={item.email}
          right={() => (
            <Button onPress={() => approve(item.uid)} loading={busy === item.uid} mode="contained-tonal">
              Approve
            </Button>
          )}
        />
      )}
    />
  );
}
