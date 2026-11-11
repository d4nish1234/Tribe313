import { useMemo } from 'react';
import { ActivityIndicator, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useEventSeriesList } from '@/src/hooks/useEventSeries';
import { CardBox, CardRow, SectionHeader, cardStyles } from '@/src/components/Cards';
import { AppButton } from '@/src/components/AppButton';
import { describeRepeat, formatTimeOfDay, upcomingOccurrences } from '@/src/lib/recurrence';
import { useNow } from '@/src/hooks/useEvents';
import type { EventSeries } from '@/src/types';

/** Recurring events: one row per series, opening its edit screen. Part of the Admin screen. */
export function RecurringSection() {
  const { loading, series } = useEventSeriesList();
  const now = useNow();

  return (
    <>
      <SectionHeader
        title="Recurring events"
        right={
          <AppButton
            variant="text"
            icon="plus"
            accessibilityLabel="Add recurring event"
            onPress={() => router.push({ pathname: '/admin/series/[id]', params: { id: 'new' } })}
          >
            Add
          </AppButton>
        }
      />
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : series.length === 0 ? (
        <Text style={cardStyles.muted}>
          None yet. A recurring event adds itself to Events every week, 2 weeks or month.
        </Text>
      ) : (
        <CardBox>
          {series.map((s, i) => (
            <SeriesRow key={s.id} s={s} first={i === 0} now={now} />
          ))}
        </CardBox>
      )}
    </>
  );
}

function SeriesRow({ s, first, now }: { s: EventSeries; first: boolean; now: number }) {
  const next = useMemo(() => upcomingOccurrences(s, now, 400)[0] ?? null, [s, now]);
  const when = `${describeRepeat(s)} · ${formatTimeOfDay(s.timeOfDay)} · ${s.location.label}`;
  return (
    <CardRow
      first={first}
      title={s.title}
      subtitle={
        <>
          <Text style={cardStyles.muted}>{when}</Text>
          <Text style={cardStyles.muted}>
            {next ? `Next: ${format(parseISO(next.date), 'EEE, MMM d')}` : 'Ended'}
          </Text>
        </>
      }
      onPress={() => router.push({ pathname: '/admin/series/[id]', params: { id: s.id } })}
    />
  );
}
