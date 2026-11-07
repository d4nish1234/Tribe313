import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, SegmentedButtons, Text } from 'react-native-paper';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { latestVersion, getVersion } from '@/src/benchmark/registry';
import { useAllBenchmarkProfiles, useAllBenchmarkSessions, useAssignmentCounts } from '@/src/benchmark/hooks';
import { knownSessions, newestFirst, scoreSession } from '@/src/benchmark/engine/score';
import { formatDate } from '@/src/benchmark/engine/format';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { LevelBadge } from '@/src/benchmark/components/Bits';
import { displayResult } from '@/src/benchmark/components/display';
import { shareBenchmarkPdf } from '@/src/benchmark/pdf';
import { B } from '@/src/benchmark/theme';
import type { Session } from '@/src/benchmark/types';
import { rowDivider } from '@/src/components/RowDivider';
import { palette } from '@/src/theme';

export default function CoachScreen() {
  return (
    <ExplainProvider>
      <Coach />
    </ExplainProvider>
  );
}

interface Row {
  uid: string;
  name: string;
  latest: Session | null;
  sessions: Session[];
  assigned: number;
}

function Coach() {
  const { isAdmin } = useAuth();
  const explain = useExplain();
  const { loading: mLoading, members } = useMembers();
  const { loading: sLoading, byUid } = useAllBenchmarkSessions(isAdmin);
  const counts = useAssignmentCounts(isAdmin);
  const profiles = useAllBenchmarkProfiles(isAdmin);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [exporting, setExporting] = useState(false);
  const v = latestVersion();

  const rows: Row[] = useMemo(
    () =>
      members
        .map((m) => {
          const sessions = byUid[m.uid] ?? [];
          return {
            uid: m.uid,
            name: `${m.firstName} ${m.lastName}`.trim(),
            sessions,
            latest: knownSessions(sessions)[0] ?? null,
            assigned: counts[m.uid] ?? 0,
          };
        })
        // Members with benchmarks first (newest first), then the rest by name.
        .sort((a, b) => {
          if (a.latest && b.latest) return a.latest.date < b.latest.date ? 1 : -1;
          if (a.latest) return -1;
          if (b.latest) return 1;
          return a.name.localeCompare(b.name);
        }),
    [members, byUid, counts],
  );

  const exportAll = async () => {
    setExporting(true);
    try {
      await shareBenchmarkPdf({
        title: '313 Tribe benchmarks',
        includeGroupTable: true,
        members: rows
          .filter((r) => r.sessions.length)
          .map((r) => ({ name: r.name, heightIn: profiles[r.uid]?.heightIn ?? null, sessions: newestFirst(r.sessions) })),
      });
    } catch (e: any) {
      Alert.alert('Couldn’t create PDF', String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text>Only coaches can see this screen.</Text>
      </View>
    );
  }

  const header = (
    <Stack.Screen
      options={{
        title: 'Coach',
        headerRight: () =>
          exporting ? (
            <ActivityIndicator style={{ marginRight: 12 }} />
          ) : (
            <IconButton icon="file-pdf-box" accessibilityLabel="Export PDF" onPress={exportAll} />
          ),
      }}
    />
  );

  if (mLoading || sLoading) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: B.background }}>
      {header}
      <View style={styles.toolbar}>
        <SegmentedButtons
          value={view}
          onValueChange={(x) => setView(x as 'list' | 'grid')}
          buttons={[
            { value: 'list', label: 'Members', icon: 'account-multiple' },
            { value: 'grid', label: 'Grid', icon: 'table' },
          ]}
        />
        <View style={styles.links}>
          <InfoLink
            label={view === 'grid' ? 'Reading the grid' : 'Assigning exercises'}
            onPress={() => explain(v.explainer(view === 'grid' ? 'coachgrid' : 'coachhow'))}
          />
        </View>
      </View>
      {view === 'list' ? <MemberList rows={rows} /> : <Grid rows={rows} />}
    </View>
  );
}

function open(uid: string) {
  router.push({ pathname: '/benchmark/coach/[uid]', params: { uid } });
}

function MemberList({ rows }: { rows: Row[] }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {rows.map((r, i) => {
          const sc = r.latest ? scoreSession(r.latest) : null;
          return (
            <Pressable
              key={r.uid}
              style={[styles.memberRow, i > 0 && styles.rowBorder]}
              onPress={() => open(r.uid)}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.name}</Text>
                <Text style={styles.muted}>
                  {r.latest ? formatDate(r.latest.date) : 'No benchmarks yet'}
                  {r.assigned ? ` · ${r.assigned} assigned` : ''}
                </Text>
              </View>
              {sc ? (
                <Text style={styles.score}>
                  {sc.score}
                  <Text style={styles.muted}>/{sc.maxScore}</Text>
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={B.muted} />
            </Pressable>
          );
        })}
        {rows.length === 0 ? <Text style={[styles.muted, { padding: 12 }]}>No members.</Text> : null}
      </View>
    </ScrollView>
  );
}

const NAME_W = 120;
const CELL_W = 76;
const ROW_H = 56;

function Grid({ rows }: { rows: Row[] }) {
  const v = latestVersion();
  const keys = v.scoredKeys;
  const withData = rows.filter((r) => r.latest);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.grid}>
        {/* Pinned name column */}
        <View style={{ width: NAME_W }}>
          <View style={[styles.gridHead, { height: ROW_H }]}>
            <Text style={styles.th}>Name</Text>
          </View>
          {withData.map((r) => (
            <Pressable key={r.uid} style={[styles.gridName, { height: ROW_H }]} onPress={() => open(r.uid)}>
              <Text style={[styles.name, styles.link]} numberOfLines={2}>
                {r.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.gridRow, styles.gridHead, { height: ROW_H }]}>
              <Text style={[styles.th, { width: 92 }]}>Date</Text>
              <Text style={[styles.th, { width: 56 }]}>Score</Text>
              {keys.map((k) => (
                <Text key={k} style={[styles.th, { width: CELL_W }]} numberOfLines={2}>
                  {v.tests[k].name}
                </Text>
              ))}
            </View>
            {withData.map((r) => {
              const s = r.latest!;
              const sv = getVersion(s.version)!;
              const sc = scoreSession(s);
              return (
                <View key={r.uid} style={[styles.gridRow, { height: ROW_H }]}>
                  <Text style={[styles.td, { width: 92 }]}>{s.date}</Text>
                  <Text style={[styles.td, { width: 56, fontWeight: '700' }]}>{sc ? `${sc.score}` : '—'}</Text>
                  {keys.map((k) => (
                    <View key={k} style={{ width: CELL_W, alignItems: 'flex-start', gap: 2 }}>
                      <LevelBadge level={sv.tests[k] ? sv.levelFor(k, s) : null} />
                      <Text style={styles.cellValue} numberOfLines={1}>
                        {sv.tests[k] ? (displayResult(sv, k, s) ?? '') : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      {withData.length === 0 ? <Text style={[styles.muted, { padding: 16 }]}>No benchmarks yet.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { padding: 16, paddingBottom: 0, gap: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  links: { alignItems: 'flex-end' },
  content: { padding: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { backgroundColor: B.surface, borderRadius: 12, paddingHorizontal: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  rowBorder: rowDivider,
  name: { fontSize: 16, fontWeight: '600', color: B.text },
  link: { color: B.green },
  muted: { color: B.muted, fontSize: 13 },
  score: { fontSize: 20, fontWeight: '700', color: B.green },
  grid: { flexDirection: 'row', marginTop: 12, backgroundColor: B.surface },
  gridHead: { justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: B.border },
  gridName: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
    borderRightWidth: 1,
    borderRightColor: B.border,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  th: { fontSize: 11, fontWeight: '700', color: B.muted, textTransform: 'uppercase', paddingHorizontal: 4 },
  td: { fontSize: 13, color: B.text, paddingHorizontal: 4 },
  cellValue: { fontSize: 11, color: B.muted },
});
