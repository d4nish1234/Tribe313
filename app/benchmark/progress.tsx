import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { useBenchmarkProfile, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { ExplainProvider } from '@/src/benchmark/components/Explain';
import { ProgressView } from '@/src/benchmark/components/ProgressView';
import { cardStyles } from '@/src/components/Cards';
import { B } from '@/src/benchmark/theme';

/**
 * Progress for the signed-in member, or for `uid` when a coach opens it from
 * a member's coach page.
 */
export default function ProgressScreen() {
  return (
    <ExplainProvider>
      <Progress />
    </ExplainProvider>
  );
}

function Progress() {
  const params = useLocalSearchParams<{ uid?: string }>();
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const self = !params.uid || params.uid === firebaseUser?.uid;
  const uid = self ? firebaseUser?.uid : isAdmin ? params.uid : undefined;
  const { members } = useMembers(!self);
  const { loading, sessions } = useBenchmarkSessions(uid);
  const { profile } = useBenchmarkProfile(uid);

  const member = self ? appUser : members.find((m) => m.uid === uid);
  const name = member ? `${member.firstName} ${member.lastName}`.trim() : '';

  if (!uid) {
    return (
      <View style={styles.center}>
        <Text>Only coaches can see this screen.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: B.background }}
      contentContainerStyle={[cardStyles.content, { paddingBottom: 32 + insets.bottom }]}
    >
      <Stack.Screen options={{ title: self ? 'Progress' : name || 'Progress' }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <ProgressView sessions={sessions} name={name} heightIn={profile?.heightIn ?? null} self={self} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
