import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { useAssignments, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { addAssignment, removeAssignment } from '@/src/benchmark/data';
import { knownSessions, scoreSession, weakestFirst } from '@/src/benchmark/engine/score';
import { LEVEL_LONG, formatDate } from '@/src/benchmark/engine/format';
import { ExplainProvider, ExplainText, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { LevelBadge } from '@/src/benchmark/components/Bits';
import { ProgressTable } from '@/src/benchmark/components/ProgressTable';
import { displayResult } from '@/src/benchmark/components/display';
import { B } from '@/src/benchmark/theme';
import { CardRow, rowDivider } from '@/src/components/Cards';
import { pickOne, toPickItem } from '@/src/lib/picker';
import { AppButton } from '@/src/components/AppButton';

export default function MemberScreen() {
  return (
    <ExplainProvider>
      <Member />
    </ExplainProvider>
  );
}

function Member() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { isAdmin, appUser, firebaseUser } = useAuth();
  const explain = useExplain();
  const { members } = useMembers(true);
  const member = members.find((m) => m.uid === uid);
  const name = member ? `${member.firstName} ${member.lastName}`.trim() : 'Member';
  const { loading, sessions } = useBenchmarkSessions(isAdmin ? uid : undefined);
  const { assignments } = useAssignments(isAdmin ? uid : undefined);

  const known = useMemo(() => knownSessions(sessions), [sessions]);
  const latest = known[0] ?? null;
  const first = known.length > 1 ? known[known.length - 1] : null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const sc = latest ? scoreSession(latest) : null;
  const weakest = latest ? weakestFirst(latest).filter((k) => v.levelFor(k, latest) !== null).slice(0, 3) : [];

  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  // Pick from the plan's exercises, or type a new one (allowCustom).
  const chooseExercise = async () => {
    const picked = await pickOne({
      title: 'Choose exercise',
      items: latestVersion().allExercises().map(toPickItem),
      selected: text ? [text] : [],
      allowCustom: true,
      searchPlaceholder: 'Search or type an exercise',
    });
    if (picked) setText(picked.slice(0, 200));
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text>Only coaches can see this screen.</Text>
      </View>
    );
  }

  const add = async () => {
    if (!text.trim() || !firebaseUser) return;
    setAdding(true);
    try {
      await addAssignment({
        memberUid: uid,
        text,
        note: note || null,
        coachUid: firebaseUser.uid,
        coachName: appUser?.firstName || 'Coach',
      });
      setText('');
      setNote('');
    } catch (e: any) {
      Alert.alert('Couldn’t add', String(e?.message ?? e));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      return;
    }
    setConfirmRemove(null);
    try {
      await removeAssignment(uid, id);
    } catch (e: any) {
      Alert.alert('Couldn’t remove', String(e?.message ?? e));
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: B.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: name }} />

      {loading ? (
        <ActivityIndicator />
      ) : latest ? (
        <>
          <View style={styles.summary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Overall</Text>
              <Text style={styles.summaryValue}>
                {sc?.overall != null ? LEVEL_LONG[sc.overall] : 'In progress'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Score</Text>
              <Text style={styles.summaryValue}>{sc ? `${sc.score}/${sc.maxScore}` : '—'}</Text>
            </View>
          </View>

          <Text style={styles.group}>Weakest tests</Text>
          <View style={styles.card}>
            {weakest.map((k, i) => (
              <View key={k} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={[styles.body, { flex: 1 }]}>{v.tests[k].name}</Text>
                <Text style={styles.muted}>{displayResult(v, k, latest)}</Text>
                <LevelBadge level={v.levelFor(k, latest)} />
              </View>
            ))}
          </View>

          <Text style={styles.group}>{first ? 'First vs latest' : 'Latest benchmark'}</Text>
          <View style={[styles.card, { paddingVertical: 8 }]}>
            <ProgressTable v={v} latest={latest} first={first} />
          </View>

          <Text style={styles.group}>Benchmarks</Text>
          <View style={styles.card}>
            {sessions.map((s, i) => {
              const ss = scoreSession(s);
              return (
                <View key={s.date} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={[styles.body, { flex: 1 }]}>{formatDate(s.date)}</Text>
                  <Text style={styles.muted}>{s.bodyweight} lb</Text>
                  <Text style={styles.score}>{ss ? `${ss.score}/${ss.maxScore}` : `v${s.version}`}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={[styles.body, { paddingVertical: 12 }]}>{name} hasn’t done a benchmark yet.</Text>
        </View>
      )}

      <View style={styles.rowBetween}>
        <Text style={styles.group}>Assigned exercises</Text>
        <InfoLink label="How?" onPress={() => explain(v.explainer('coachhow'))} />
      </View>
      <View style={styles.card}>
        {assignments.length === 0 ? (
          <Text style={[styles.muted, { paddingVertical: 12 }]}>Nothing assigned yet.</Text>
        ) : (
          assignments.map((a, i) => (
            <View key={a.id} style={[styles.row, i > 0 && styles.rowBorder, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, paddingVertical: 4 }}>
                <ExplainText text={a.text} glossary={v.glossary} />
                <Text style={styles.muted}>
                  {a.note ? `${a.note} · ` : ''}by {a.addedByName}
                </Text>
              </View>
              <AppButton
                compact
                variant={confirmRemove === a.id ? 'primary' : 'text'}
                tone="danger"
                onPress={() => remove(a.id)}
              >
                {confirmRemove === a.id ? 'Tap to confirm' : 'Remove'}
              </AppButton>
            </View>
          ))
        )}
      </View>

      <Text style={styles.group}>Assign an exercise</Text>
      <View style={[styles.card, { paddingVertical: 12, gap: 8 }]}>
        <View style={styles.pickRow}>
          <CardRow
            first
            title="Exercise"
            onPress={chooseExercise}
            accessibilityHint="Opens the list of exercises to choose from"
            right={
              <Text style={[styles.pickValue, !text && { color: B.muted }]} numberOfLines={2}>
                {text || 'Choose'}
              </Text>
            }
          />
        </View>
        <TextInput
          mode="outlined"
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. every morning"
          activeOutlineColor={B.green}
          maxLength={200}
        />
        <AppButton
          onPress={add}
          loading={adding}
          disabled={!text.trim() || adding}
        >
          Add
        </AppButton>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 48 },
  summary: { flexDirection: 'row', backgroundColor: B.green, borderRadius: 16, padding: 16, gap: 12 },
  summaryLabel: { color: B.goldSoft, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 2 },
  group: { fontSize: 13, fontWeight: '700', color: B.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: B.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 4 },
  rowBorder: rowDivider,
  pickRow: { borderWidth: 1, borderColor: B.border, borderRadius: 10, paddingHorizontal: 12 },
  pickValue: { flexShrink: 1, maxWidth: '60%', textAlign: 'right', fontSize: 16, color: B.text },
  body: { fontSize: 15, color: B.text },
  muted: { color: B.muted, fontSize: 13 },
  score: { fontWeight: '700', color: B.green, minWidth: 48, textAlign: 'right' },
});
