import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { approveUser } from '@/src/firebase/fn';
import { db } from '@/src/firebase/config';
import { CardBox, CardRow, SectionHeader, cardStyles } from '@/src/components/Cards';
import { AppButton } from '@/src/components/AppButton';

export default function Approvals() {
  const { isAdmin } = useAuth();
  const { loading, members } = useMembers(true);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isAdmin) return <Redirect href="/" />;

  const pending = members.filter((m) => m.status === 'pending' && m.emailVerified === true);
  const dismissed = members.filter((m) => m.status === 'dismissed');

  async function approve(uid: string) {
    setBusy(uid);
    try {
      await approveUser({ uid });
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(uid: string) {
    setBusy(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'dismissed' });
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function restore(uid: string) {
    setBusy(uid);
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'pending' });
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
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
    <ScrollView contentContainerStyle={[cardStyles.content, { paddingBottom: 40 }]}>
      <SectionHeader title="Waiting for approval" />
      {pending.length === 0 ? (
        <Text style={cardStyles.muted}>No pending members.</Text>
      ) : (
        <CardBox>
          {pending.map((item, i) => (
            <CardRow
              key={item.uid}
              first={i === 0}
              title={`${item.firstName} ${item.lastName}`}
              subtitle={
                <>
                  <Text style={cardStyles.muted} selectable>
                    {item.email}
                  </Text>
                  <View style={styles.actions}>
                    <AppButton
                      variant="secondary"
                      style={styles.action}
                      onPress={() => dismiss(item.uid)}
                      disabled={busy === item.uid}
                    >
                      Dismiss
                    </AppButton>
                    <AppButton style={styles.action} onPress={() => approve(item.uid)} loading={busy === item.uid}>
                      Approve
                    </AppButton>
                  </View>
                </>
              }
            />
          ))}
        </CardBox>
      )}

      {dismissed.length > 0 && (
        <>
          <SectionHeader title="Not approved" />
          <CardBox>
            {dismissed.map((item, i) => (
              <CardRow
                key={item.uid}
                first={i === 0}
                dim
                title={`${item.firstName} ${item.lastName}`}
                subtitle={item.email}
                right={
                  <AppButton
                    variant="text"
                    onPress={() => restore(item.uid)}
                    loading={busy === item.uid}
                  >
                    Restore
                  </AppButton>
                }
              />
            ))}
          </CardBox>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  action: { flex: 1 },
});
