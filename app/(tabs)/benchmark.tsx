import { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, Text } from 'react-native-paper';
import { AppFab } from '@/src/components/AppButton';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { latestVersion, getVersion, LATEST_VERSION } from '@/src/benchmark/registry';
import { useAssignments, useBenchmarkProfile, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { saveHeight } from '@/src/benchmark/data';
import { knownSessions, scoreSession } from '@/src/benchmark/engine/score';
import { LEVEL_LONG, formatDate, formatFtIn } from '@/src/benchmark/engine/format';
import { ExplainProvider, ExplainText, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { PickerSheet } from '@/src/benchmark/components/PickerSheet';
import { shareBenchmarkPdf } from '@/src/benchmark/pdf';
import { B, TAP } from '@/src/benchmark/theme';
import type { Session } from '@/src/benchmark/types';

export default function BenchmarkTab() {
  return (
    <ExplainProvider>
      <BenchmarkHome />
    </ExplainProvider>
  );
}

function BenchmarkHome() {
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const uid = firebaseUser?.uid;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const explain = useExplain();

  const { loading, sessions } = useBenchmarkSessions(uid);
  const { profile } = useBenchmarkProfile(uid);
  const { assignments } = useAssignments(uid);
  const [editHeight, setEditHeight] = useState(false);
  const [exporting, setExporting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdmin
        ? () => (
            <IconButton
              icon="clipboard-account-outline"
              accessibilityLabel="Coach"
              onPress={() => router.push('/benchmark/coach')}
            />
          )
        : undefined,
    });
  }, [navigation, isAdmin]);

  const latest = useMemo(() => knownSessions(sessions)[0] ?? null, [sessions]);
  const latestScore = latest ? scoreSession(latest) : null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const name = appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '';
  const coachNames = [...new Set(assignments.map((a) => a.addedByName).filter(Boolean))];
  const coachLabel = coachNames.length ? coachNames.join(' & ') : 'your coach';

  const exportMine = async () => {
    setExporting(true);
    try {
      await shareBenchmarkPdf({
        title: `${name || 'My'} benchmarks`,
        includeGroupTable: false,
        members: [{ name: name || 'Me', heightIn: profile?.heightIn ?? null, sessions }],
      });
    } catch (e: any) {
      Alert.alert('Couldn’t create PDF', String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: B.background }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}>
        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Overall</Text>
              <Text style={styles.summaryValue}>
                {latestScore?.overall != null ? LEVEL_LONG[latestScore.overall] : latest ? 'In progress' : '—'}
              </Text>
              <InfoLink light label="What does this mean?" onPress={() => explain(v.explainer('overall'))} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Score</Text>
              <Text style={styles.summaryValue}>
                {latestScore ? `${latestScore.score}/${latestScore.maxScore}` : `0/${v.maxScore}`}
              </Text>
              <InfoLink light label="What does this mean?" onPress={() => explain(v.explainer('score'))} />
            </View>
          </View>
          {latestScore && latestScore.overall === null ? (
            <Text style={styles.summaryNote}>
              {latestScore.tested} of {latestScore.total} tests done
            </Text>
          ) : null}
          <Pressable
            style={styles.planButton}
            onPress={() => router.push('/benchmark/plan')}
            accessibilityRole="button"
          >
            <Text style={styles.planButtonText}>Your plan</Text>
            <Ionicons name="chevron-forward" size={18} color={B.green} />
          </Pressable>
        </View>

        {/* Extra from coach */}
        {assignments.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Extra from {coachLabel}</Text>
              <InfoLink
                label="What’s this?"
                onPress={() => explain(v.explainer('coachinfo', { coachName: coachNames[0] }))}
              />
            </View>
            {assignments.map((a) => (
              <View key={a.id} style={styles.assignment}>
                <ExplainText text={a.text} glossary={v.glossary} style={{ fontWeight: '600' }} />
                {a.note ? <Text style={styles.muted}>{a.note}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Benchmarks */}
        <Text style={styles.group}>Your benchmarks</Text>
        {sessions.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyTitle}>No benchmarks yet</Text>
            <Text style={styles.body}>
              Tap <Text style={{ fontWeight: '700' }}>New benchmark</Text> to do your first one. Until then, every test
              shows the “Reach L1” plan.
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {sessions.map((s, i) => (
              <BenchmarkRow
                key={s.date}
                s={s}
                first={i === 0}
                onPress={() => router.push({ pathname: '/benchmark/entry/[date]', params: { date: s.date } })}
              />
            ))}
          </View>
        )}

        {/* Me */}
        <View style={[styles.card, { paddingVertical: 4 }]}>
          <ListRow
            icon="resize-outline"
            label="Height"
            value={profile?.heightIn ? formatFtIn(profile.heightIn) : 'Not set'}
            onPress={() => setEditHeight(true)}
          />
          <View style={styles.divider} />
          <ListRow
            icon="document-text-outline"
            label={exporting ? 'Creating PDF…' : 'Share my results (PDF)'}
            onPress={sessions.length && !exporting ? exportMine : undefined}
          />
        </View>

        {/* Good to know */}
        <Text style={styles.group}>Good to know</Text>
        <View style={[styles.card, { paddingVertical: 4 }]}>
          {v.goodToKnow.map((g, i) => (
            <View key={g.explainer}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ListRow icon="information-circle-outline" label={g.label} onPress={() => explain(v.explainer(g.explainer))} />
            </View>
          ))}
        </View>
      </ScrollView>

      <AppFab
        icon="plus"
        label="New benchmark"
        onPress={() => router.push({ pathname: '/benchmark/entry/[date]', params: { date: 'new' } })}
      />

      <PickerSheet
        spec={editHeight ? latestVersion().picker('height') : null}
        visible={editHeight}
        value={profile?.heightIn ?? null}
        fallback={latestVersion().pickerDefault('height')}
        clearable={false}
        onClose={() => setEditHeight(false)}
        onDone={(val) => {
          setEditHeight(false);
          if (uid && val) saveHeight(uid, name, val).catch((e) => Alert.alert('Couldn’t save', String(e?.message ?? e)));
        }}
      />
    </View>
  );
}

function BenchmarkRow({
  s,
  first,
  onPress,
}: {
  s: Session;
  first: boolean;
  onPress: () => void;
}) {
  const sc = scoreSession(s);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.benchRow, !first && styles.rowBorder]}
      accessibilityRole="button"
      accessibilityHint="Opens this benchmark to edit or delete it."
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.benchDate}>{formatDate(s.date)}</Text>
        <Text style={styles.muted}>
          {s.bodyweight} lb
          {sc ? ` · ${sc.tested}/${sc.total} tests` : ''}
          {s.version !== LATEST_VERSION ? ` · v${s.version}` : ''}
        </Text>
      </View>
      {sc ? (
        <Text style={styles.benchScore}>
          {sc.score}
          <Text style={styles.muted}>/{sc.maxScore}</Text>
        </Text>
      ) : (
        <Text style={styles.muted}>Update app</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={B.muted} />
    </Pressable>
  );
}

function ListRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.listRow} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={B.green} />
      <Text style={[styles.body, { flex: 1 }, !onPress && { color: B.muted }]}>{label}</Text>
      {value ? <Text style={styles.muted}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={B.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  summary: { backgroundColor: B.green, borderRadius: 16, padding: 16, gap: 10 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryLabel: { color: B.goldSoft, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 2 },
  summaryNote: { color: B.goldSoft },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: B.gold,
    borderRadius: 10,
    minHeight: TAP,
  },
  planButtonText: { color: B.green, fontWeight: '700', fontSize: 16 },
  card: { backgroundColor: B.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: B.text, flex: 1 },
  assignment: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border, gap: 2 },
  group: { fontSize: 13, fontWeight: '700', color: B.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: B.text, marginBottom: 4 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  benchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border },
  benchDate: { fontSize: 16, fontWeight: '600', color: B.text },
  benchScore: { fontSize: 20, fontWeight: '700', color: B.green },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: B.border },
});
