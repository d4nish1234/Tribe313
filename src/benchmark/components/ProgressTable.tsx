import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { getVersion } from '../registry';
import { weakestFirst } from '../engine/score';
import { B } from '../theme';
import type { BenchmarkVersion, Session } from '../types';
import { LevelBadge } from './Bits';
import { displayResult } from './display';

/**
 * First / Latest / Level table for tested items, then untested items and the
 * bodyweight change. The First column only shows with 2+ benchmarks.
 * `first` may be on an older version; tests it doesn't have show "—".
 */
export function ProgressTable({
  v,
  latest,
  first,
}: {
  v: BenchmarkVersion;
  latest: Session;
  first: Session | null;
}) {
  const tested = weakestFirst(latest).filter((k) => v.levelFor(k, latest) !== null);
  const untested = v.scoredKeys.filter((k) => !tested.includes(k));
  const firstV = first ? getVersion(first.version) : null;
  const bwChange = first ? latest.bodyweight - first.bodyweight : null;
  return (
    <View>
      <View style={[styles.tableRow, styles.tableHead]}>
        <Text style={[styles.th, { flex: 2 }]}>Test</Text>
        {first ? <Text style={[styles.th, styles.num]}>First</Text> : null}
        <Text style={[styles.th, styles.num]}>Latest</Text>
        <Text style={[styles.th, styles.lvl]}>Level</Text>
      </View>
      {tested.map((k) => (
        <View key={k} style={styles.tableRow}>
          <Text style={[styles.td, { flex: 2 }]}>{v.tests[k].name}</Text>
          {first ? (
            <Text style={[styles.td, styles.num]}>
              {firstV?.tests[k] ? (displayResult(firstV, k, first) ?? '—') : '—'}
            </Text>
          ) : null}
          <Text style={[styles.td, styles.num, { fontWeight: '600' }]}>{displayResult(v, k, latest) ?? '—'}</Text>
          <View style={styles.lvl}>
            <LevelBadge level={v.levelFor(k, latest)} />
          </View>
        </View>
      ))}
      {tested.length === 0 ? <Text style={styles.muted}>No tests done yet.</Text> : null}
      {untested.length ? (
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Not tested yet: {untested.map((k) => v.tests[k].name).join(', ')}
        </Text>
      ) : null}
      <Text style={styles.body}>
        Bodyweight: {latest.bodyweight} lb
        {bwChange !== null && bwChange !== 0 ? (
          <Text style={styles.muted}>
            {' '}
            ({bwChange > 0 ? '+' : ''}
            {bwChange} lb since first)
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36, gap: 6 },
  tableHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: B.border },
  th: { fontSize: 12, fontWeight: '700', color: B.muted, textTransform: 'uppercase' },
  td: { fontSize: 14, color: B.text },
  num: { flex: 1.2, textAlign: 'right', fontVariant: ['tabular-nums'] },
  lvl: { width: 40, alignItems: 'center', textAlign: 'center' },
  muted: { color: B.muted, fontSize: 13 },
  body: { fontSize: 15, color: B.text, marginTop: 8 },
});
