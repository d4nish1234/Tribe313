import { useMemo, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CardBox, CardRow, SectionHeader, rowDivider } from '@/src/components/Cards';
import { getVersion, LATEST_VERSION, latestVersion } from '../registry';
import { knownSessions, scoreSession } from '../engine/score';
import { formatDate, formatValue } from '../engine/format';
import {
  bodyweightPoints,
  changeSinceFirst,
  formatChange,
  scorePoints,
  testPoints,
  type Point,
} from '../engine/progress';
import { shareBenchmarkPdf } from '../pdf';
import { B } from '../theme';
import type { BenchmarkVersion, Session } from '../types';
import { LevelBadge } from './Bits';
import { InfoLink, useExplain } from './Explain';
import { ScoreChart, Sparkline, shortDate } from './Charts';

/**
 * A member's progress: score over time, each test's trend since their first
 * result, bodyweight, their benchmarks, and a PDF to share. The member sees
 * it from Benchmark → Progress; coaches see the same view per member.
 * Needs an ExplainProvider above it.
 *
 * `self`: the member's own view. Their benchmarks open for editing; a coach's
 * list is read-only (coaches can't change a member's results).
 */
export function ProgressView({
  sessions,
  name,
  heightIn,
  self,
}: {
  sessions: Session[];
  name: string;
  heightIn: number | null;
  self: boolean;
}) {
  const explain = useExplain();
  const [exporting, setExporting] = useState(false);
  const known = useMemo(() => knownSessions(sessions), [sessions]);
  const latest = known[0] ?? null;
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const scores = useMemo(() => scorePoints(sessions), [sessions]);
  const weights = useMemo(() => bodyweightPoints(sessions), [sessions]);

  const share = async () => {
    setExporting(true);
    try {
      await shareBenchmarkPdf({
        title: self ? `${name || 'My'} benchmarks` : `${name} benchmarks`,
        includeGroupTable: false,
        members: [{ name: name || 'Me', heightIn, sessions }],
      });
    } catch (e: any) {
      Alert.alert('Couldn’t create PDF', String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  if (!latest) {
    return (
      <CardBox style={{ paddingVertical: 12 }}>
        <Text style={styles.body}>
          {self
            ? 'Do your first benchmark to start tracking your progress here.'
            : `${name || 'This member'} hasn’t done a benchmark yet.`}
        </Text>
      </CardBox>
    );
  }

  const withData = v.logOrder
    .map((key) => ({ key, points: testPoints(sessions, key, v.tests[key]) }))
    .filter((r) => r.points.length > 0);
  const untested = v.logOrder.filter((k) => !withData.some((r) => r.key === k));

  const scoreLabel = `Score over time. ${scores
    .map(
      (p) =>
        `${shortDate(p.date, true)}: ${p.value} of ${p.max}${
          p.tested < p.total ? `, ${p.tested} of ${p.total} tests done` : ''
        }`,
    )
    .join('. ')}`;

  return (
    <>
      <SectionHeader
        title="Score"
        right={<InfoLink label="What does this mean?" onPress={() => explain(v.explainer('score'))} />}
      />
      <CardBox style={{ paddingVertical: 12 }}>
        <ScoreChart points={scores} max={v.maxScore} accessibilityLabel={scoreLabel} />
        {scores.length === 1 ? (
          <Text style={[styles.muted, { marginTop: 6 }]}>
            {self ? 'Do another benchmark to see your trend.' : 'One benchmark so far.'}
          </Text>
        ) : null}
      </CardBox>

      <SectionHeader title="Tests" />
      <CardBox>
        {withData.map((r, i) => (
          <TestTrendRow key={r.key} first={i === 0} v={v} testKey={r.key} points={r.points} known={known} />
        ))}
      </CardBox>
      {untested.length ? (
        <Text style={styles.muted}>Not tested yet: {untested.map((k) => v.tests[k].name).join(', ')}</Text>
      ) : null}

      <SectionHeader title="Bodyweight" />
      <CardBox>
        <TrendRow
          first
          title={`${weights[weights.length - 1].value} lb`}
          points={weights}
          change={changeSinceFirst(weights, null)}
          changeText={(d) => formatChange('lb', d)}
        />
      </CardBox>

      <SectionHeader title={self ? 'Your benchmarks' : 'Benchmarks'} />
      <CardBox>
        {sessions.map((s, i) => (
          <BenchmarkRow
            key={s.date}
            s={s}
            first={i === 0}
            onPress={
              self
                ? () => router.push({ pathname: '/benchmark/entry/[date]', params: { date: s.date } })
                : undefined
            }
          />
        ))}
      </CardBox>

      <CardBox>
        <CardRow
          first
          left={<Ionicons name="share-outline" size={20} color={B.green} />}
          title={exporting ? 'Creating PDF…' : self ? 'Share my results (PDF)' : `Share ${name}’s results (PDF)`}
          onPress={exporting ? undefined : share}
          dim={exporting}
        />
      </CardBox>
    </>
  );
}

function TestTrendRow({
  v,
  testKey,
  points,
  known,
  first,
}: {
  v: BenchmarkVersion;
  testKey: string;
  points: Point[];
  known: Session[];
  first: boolean;
}) {
  const t = v.tests[testKey];
  // The level of the benchmark this latest result came from. Both wall sit
  // results feed the one "Wall sit" level.
  const from = known.find((s) => s.date === points[points.length - 1].date)!;
  const scoredKey = testKey === 'ws1' || testKey === 'ws2' ? 'ws' : testKey;
  const level = v.tests[scoredKey]?.scored ? getVersion(from.version)!.levelFor(scoredKey, from) : null;
  return (
    <TrendRow
      first={first}
      title={t.name}
      value={formatValue(t.input, points[points.length - 1].value)}
      points={points}
      change={changeSinceFirst(points, t.better)}
      changeText={(d) => formatChange(t.input, d)}
      badge={<LevelBadge level={level} />}
    />
  );
}

/** Name, latest value, change since the first result, and a sparkline. */
function TrendRow({
  title,
  value,
  points,
  change,
  changeText,
  badge,
  first,
}: {
  title: string;
  value?: string;
  points: Point[];
  change: ReturnType<typeof changeSinceFirst>;
  changeText: (diff: number) => string;
  badge?: ReactNode;
  first: boolean;
}) {
  const since = shortDate(points[0].date);
  const word = change?.direction === 'better' ? ' · better' : change?.direction === 'worse' ? ' · worse' : '';
  const color =
    change?.direction === 'better' ? B.green : change?.direction === 'worse' ? B.danger : B.muted;
  const icon = !change || change.diff === 0 ? 'remove' : change.diff > 0 ? 'arrow-up' : 'arrow-down';
  return (
    <View style={[styles.row, !first && styles.rowBorder]} accessible>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{title}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {change ? (
          <View style={styles.change}>
            <Ionicons name={icon} size={14} color={color} />
            <Text style={styles.muted}>
              {change.diff === 0 ? `Same as ${since}` : `${changeText(change.diff)} since ${since}${word}`}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>First result {since}</Text>
        )}
      </View>
      <Sparkline points={points} />
      {badge ?? null}
    </View>
  );
}

function BenchmarkRow({ s, first, onPress }: { s: Session; first: boolean; onPress?: () => void }) {
  const sc = scoreSession(s);
  return (
    <CardRow
      first={first}
      onPress={onPress}
      accessibilityHint={onPress ? 'Opens this benchmark to edit or delete it.' : undefined}
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 60 },
  rowBorder: rowDivider,
  title: { fontSize: 16, fontWeight: '600', color: B.text },
  value: { fontSize: 15, color: B.text, fontVariant: ['tabular-nums'] },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  muted: { color: B.muted, fontSize: 13 },
  benchScore: { fontSize: 20, fontWeight: '700', color: B.green },
});
