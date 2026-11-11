import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { CardBox, SectionHeader } from '@/src/components/Cards';
import type { Assignment, BenchmarkVersion } from '../types';
import { B } from '../theme';
import { ExplainText, InfoLink, useExplain } from './Explain';

/**
 * Exercises a coach assigned to this member, with its section heading.
 * Renders nothing when there are none. Shown on Home and on Benchmark.
 * Needs an ExplainProvider above it.
 */
export function CoachExtras({ v, assignments }: { v: BenchmarkVersion; assignments: Assignment[] }) {
  const explain = useExplain();
  if (assignments.length === 0) return null;
  const coachNames = [...new Set(assignments.map((a) => a.addedByName).filter(Boolean))];
  const coachLabel = coachNames.length ? coachNames.join(' & ') : 'your coach';

  return (
    <>
      <SectionHeader
        title={`Extra from ${coachLabel}`}
        right={
          <InfoLink
            label="What’s this?"
            onPress={() => explain(v.explainer('coachinfo', { coachName: coachNames[0] }))}
          />
        }
      />
      <CardBox>
        {assignments.map((a, i) => (
          <View key={a.id} style={[styles.row, i > 0 && styles.rowBorder]}>
            <ExplainText text={a.text} glossary={v.glossary} style={{ fontWeight: '600' }} />
            {a.note ? <Text style={styles.muted}>{a.note}</Text> : null}
          </View>
        ))}
      </CardBox>
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, gap: 2, minHeight: 60, justifyContent: 'center' },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border },
  muted: { color: B.muted, fontSize: 13 },
});
