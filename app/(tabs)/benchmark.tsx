import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { AppFab } from '@/src/components/AppButton';
import { CardBox, CardRow, SectionHeader } from '@/src/components/Cards';
import { CoachExtras } from '@/src/benchmark/components/CoachExtras';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { latestVersion, getVersion, LATEST_VERSION } from '@/src/benchmark/registry';
import { useAssignments, useBenchmarkProfile, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { saveHeight } from '@/src/benchmark/data';
import { knownSessions, scoreSession } from '@/src/benchmark/engine/score';
import { LEVEL_LONG, formatDate, formatFtIn } from '@/src/benchmark/engine/format';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
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
  const { firebaseUser, appUser } = useAuth();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();
  const explain = useExplain();

  const { loading, sessions } = useBenchmarkSessions(uid);
  const { profile } = useBenchmarkProfile(uid);
  const { assignments } = useAssignments(uid);
  const [editHeight, setEditHeight] = useState(false);
  const [exporting, setExporting] = useState(false);

  const latest = useMemo(() => knownSessions(sessions)[0] ?? null, [sessions]);
  const latestScore = latest ? scoreSession(latest) : null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const name = appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '';

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
                {latestScore?.overall != null
                  ? LEVEL_LONG[latestScore.overall]
                  : latest
                    ? 'In progress'
                    : '—'}
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

        <CoachExtras v={v} assignments={assignments} />

        {/* Benchmarks */}
        <SectionHeader title="Your benchmarks" />
        {sessions.length === 0 ? (
          <CardBox style={{ paddingVertical: 12 }}>
            <Text style={styles.emptyTitle}>No benchmarks yet</Text>
            <Text style={styles.body}>
              Tap <Text style={{ fontWeight: '700' }}>New benchmark</Text> to do your first one. Until then,
              every test shows the “Reach L1” plan.
            </Text>
          </CardBox>
        ) : (
          <CardBox>
            {sessions.map((s, i) => (
              <BenchmarkRow
                key={s.date}
                s={s}
                first={i === 0}
                onPress={() => router.push({ pathname: '/benchmark/entry/[date]', params: { date: s.date } })}
              />
            ))}
          </CardBox>
        )}

        {/* Me */}
        <CardBox>
          <ListRow
            first
            icon="resize-outline"
            label="Height"
            value={profile?.heightIn ? formatFtIn(profile.heightIn) : 'Not set'}
            onPress={() => setEditHeight(true)}
          />
          <ListRow
            icon="document-text-outline"
            label={exporting ? 'Creating PDF…' : 'Share my results (PDF)'}
            onPress={sessions.length && !exporting ? exportMine : undefined}
          />
        </CardBox>

        {/* Good to know */}
        <SectionHeader title="Good to know" />
        <CardBox>
          {v.goodToKnow.map((g, i) => (
            <ListRow
              key={g.explainer}
              first={i === 0}
              icon="information-circle-outline"
              label={g.label}
              onPress={() => explain(v.explainer(g.explainer))}
            />
          ))}
        </CardBox>
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
          if (uid && val)
            saveHeight(uid, name, val).catch((e) => Alert.alert('Couldn’t save', String(e?.message ?? e)));
        }}
      />
    </View>
  );
}

function BenchmarkRow({ s, first, onPress }: { s: Session; first: boolean; onPress: () => void }) {
  const sc = scoreSession(s);
  return (
    <CardRow
      first={first}
      onPress={onPress}
      accessibilityHint="Opens this benchmark to edit or delete it."
      title={formatDate(s.date)}
      subtitle={`${s.bodyweight} lb${sc ? ` · ${sc.tested}/${sc.total} tests` : ''}${
        s.version !== LATEST_VERSION ? ` · v${s.version}` : ''
      }`}
      right={
        sc ? (
          <Text style={styles.benchScore}>
            {sc.score}
            <Text style={styles.muted}>/{sc.maxScore}</Text>
          </Text>
        ) : (
          <Text style={styles.muted}>Update app</Text>
        )
      }
    />
  );
}

function ListRow({
  icon,
  label,
  value,
  onPress,
  first,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  first?: boolean;
}) {
  return (
    <CardRow
      first={first}
      left={<Ionicons name={icon} size={20} color={B.green} />}
      title={label}
      right={value ? <Text style={styles.muted}>{value}</Text> : null}
      onPress={onPress}
      dim={!onPress}
    />
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
  emptyTitle: { fontSize: 16, fontWeight: '700', color: B.text, marginBottom: 4 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  benchScore: { fontSize: 20, fontWeight: '700', color: B.green },
});
