import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Divider, List, Text } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { approveUser } from '@/src/firebase/fn';
import { db } from '@/src/firebase/config';

export default function Approvals() {
  const { isAdmin } = useAuth();
  const { loading, members } = useMembers(true);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/" />;

  const pending = members.filter((m) => m.status === 'pending');
  const dismissed = members.filter((m) => m.status === 'dismissed');

  async function approve(uid: string) {
    setBusy(uid);
    try {
      await approveUser({ uid });
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(uid: string) {
    setBusy(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'dismissed' });
    } finally {
      setBusy(null);
    }
  }

  async function restore(uid: string) {
    setBusy(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'pending' });
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
      data={[0]}
      keyExtractor={() => 'root'}
      renderItem={() => (
        <View>
          {pending.length === 0 ? (
            <Text style={{ padding: 24, textAlign: 'center', opacity: 0.7 }}>
              No pending members.
            </Text>
          ) : (
            pending.map((item) => (
              <List.Item
                key={item.uid}
                title={`${item.firstName} ${item.lastName}`}
                description={item.email}
                right={() => (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Button
                      onPress={() => dismiss(item.uid)}
                      loading={busy === item.uid}
                      mode="outlined"
                    >
                      Dismiss
                    </Button>
                    <Button
                      onPress={() => approve(item.uid)}
                      loading={busy === item.uid}
                      mode="contained-tonal"
                    >
                      Approve
                    </Button>
                  </View>
                )}
              />
            ))
          )}

          {dismissed.length > 0 && (
            <>
              <Divider style={{ marginTop: 8 }} />
              <Text
                variant="titleSmall"
                style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 4, opacity: 0.6 }}
              >
                Not approved
              </Text>
              {dismissed.map((item) => (
                <List.Item
                  key={item.uid}
                  title={`${item.firstName} ${item.lastName}`}
                  description={item.email}
                  titleStyle={{ opacity: 0.5 }}
                  descriptionStyle={{ opacity: 0.5 }}
                  right={() => (
                    <Button
                      onPress={() => restore(item.uid)}
                      loading={busy === item.uid}
                      mode="outlined"
                    >
                      Restore
                    </Button>
                  )}
                />
              ))}
            </>
          )}
        </View>
      )}
    />
  );
}
