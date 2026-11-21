import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useEvents } from '@/src/hooks/useEvents';
import { showRuns } from '@/src/lib/features';
import {
  DAY_LONG,
  DAY_SHORT,
  WEEK_ORDER,
  WORKOUT_DAY_COUNT,
  backToBackDays,
  monthWeeks,
  normalizeDays,
  sameDay,
  toggleDay,
  weekSchedule,
} from '@/src/lib/schedule';
import { CardBox, SectionHeader, cardStyles } from '@/src/components/Cards';
import { EventRow } from '@/src/components/EventRow';
import { useAssignments, useBenchmarkProfile, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { saveWorkoutDays } from '@/src/benchmark/data';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { knownSessions } from '@/src/benchmark/engine/score';
import { buildWorkouts } from '@/src/benchmark/engine/workouts';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { CoachExtras } from '@/src/benchmark/components/CoachExtras';
import { WeightNote } from '@/src/benchmark/components/TestPlan';
import { WorkoutExercises } from '@/src/benchmark/components/WeekWorkouts';
import { B, TAP } from '@/src/benchmark/theme';
import type { EventDoc } from '@/src/types';

/**
 * Calendar tab: the member picks the 3 weekdays they train, and every week
 * those days show their workouts (Leg Day, Upper Body Day, Grip & Cardio Day,
 * in week order), with the coach's extras on each workout day. Tap a date to
 * see that day. Admins also see the Sunday runs until runs are released.
 */
export default function CalendarTab() {
  return (
    <ExplainProvider>
      <CalendarScreen />
    </ExplainProvider>
  );
}

/** One colour per workout, in workout order, so the grid reads at a glance. */
const WORKOUT_COLORS = [B.green, B.goldText, '#4E6B58'] as const;

function CalendarScreen() {
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const uid = firebaseUser?.uid;
  const explain = useExplain();
  const { loading: pLoading, profile } = useBenchmarkProfile(uid);
  const { loading: sLoading, sessions } = useBenchmarkSessions(uid);
  const { assignments } = useAssignments(uid);
  const runsOn = showRuns(isAdmin);
  const { upcoming, past } = useEvents(runsOn);

  const latest = useMemo(() => knownSessions(sessions)[0] ?? null, [sessions]);
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const workouts = useMemo(() => buildWorkouts(v, latest), [v, latest]);
  const names = useMemo(() => workouts.map((w) => w.name), [workouts]);

  // Days being picked but not saved yet (fewer than 3). Null: show what's saved.
  const [draft, setDraft] = useState<number[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => normalizeDays(profile?.workoutDays), [profile?.workoutDays]);
  const days = draft ?? saved;
  // The day buttons follow what's being picked; the calendar keeps the saved
  // days until a new set of 3 is saved.
  const picking = useMemo(() => weekSchedule(days, names), [days, names]);
  const schedule = useMemo(() => weekSchedule(saved, names), [saved, names]);
  const tight = backToBackDays(picking.size ? days : []);

  const today = new Date();
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<Date>(today);
  const weeks = useMemo(() => monthWeeks(month.y, month.m), [month]);

  const events = useMemo(() => (runsOn ? [...upcoming, ...past] : []), [runsOn, upcoming, past]);
  const eventsOn = (d: Date): EventDoc[] =>
    events.filter((e) => {
      const at = e.startsAt?.toDate?.();
      return at ? sameDay(at, d) : false;
    });

  const pick = async (day: number) => {
    if (!uid) return;
    const next = toggleDay(days, day);
    if (next.full) {
      setHint('You’ve picked 3 days. Tap one of them to unpick it first.');
      return;
    }
    setHint(null);
    if (next.days.length !== WORKOUT_DAY_COUNT) {
      setDraft(next.days);
      return;
    }
    setDraft(next.days);
    setSaving(true);
    try {
      const name = appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '';
      await saveWorkoutDays(uid, name, next.days);
      setDraft(null);
    } catch (e: any) {
      setHint(`Couldn’t save your days: ${e?.message ?? e}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  if (pLoading || sLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const missing = WORKOUT_DAY_COUNT - days.length;
  const selectedWorkout = schedule.get(selected.getDay());
  const workout = workouts.find((w) => w.name === selectedWorkout) ?? null;
  const selectedEvents = eventsOn(selected);
  const monthStart = new Date(month.y, month.m, 1);
  const shiftMonth = (by: number) => {
    const d = new Date(month.y, month.m + by, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    // Keep the day details in the month on screen: today if it's this month, else the 1st.
    setSelected(d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() ? today : d);
  };

  return (
    <ScrollView style={{ backgroundColor: B.background }} contentContainerStyle={styles.content}>
      <SectionHeader
        title="Your workout days"
        right={<InfoLink label="How?" onPress={() => explain(v.explainer('week'))} />}
      />
      <CardBox style={styles.pickerCard}>
        <Text style={cardStyles.muted}>
          Pick 3 days. Your workouts go on them in order through the week: {names.join(', then ')}.
        </Text>
        <View style={styles.dayRow}>
          {WEEK_ORDER.map((d) => {
            const on = days.includes(d);
            const w = picking.get(d);
            const i = w ? names.indexOf(w) : -1;
            return (
              <Pressable
                key={d}
                onPress={() => pick(d)}
                disabled={saving}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: saving }}
                accessibilityLabel={`${DAY_LONG[d]}${w ? `, ${w}` : ''}`}
                style={[styles.day, on && { backgroundColor: i >= 0 ? WORKOUT_COLORS[i] : B.green, borderColor: 'transparent' }]}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]} maxFontSizeMultiplier={1.3}>
                  {DAY_SHORT[d]}
                </Text>
                <Text style={[styles.dayWorkout, on && styles.dayTextOn]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
                  {w ? shortName(w) : ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {saving ? (
          <Text style={cardStyles.muted}>Saving…</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : missing > 0 ? (
          <Text style={styles.hint}>
            Pick {missing} more day{missing === 1 ? '' : 's'}.
            {saved.length === WORKOUT_DAY_COUNT ? ' Until then your old days stay saved.' : ''}
          </Text>
        ) : tight.length ? (
          <Text style={cardStyles.muted}>
            {tight.map(([a, b]) => `${DAY_SHORT[a]} and ${DAY_SHORT[b]}`).join(', ')} are back to back. A rest day
            between workouts helps you recover.
          </Text>
        ) : null}
      </CardBox>

      <CardBox style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => shiftMonth(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.monthArrow}
            hitSlop={6}
          >
            <Ionicons name="chevron-back" size={22} color={B.green} />
          </Pressable>
          <Text style={styles.monthTitle} accessibilityRole="header">
            {format(monthStart, 'MMMM yyyy')}
          </Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.monthArrow}
            hitSlop={6}
          >
            <Ionicons name="chevron-forward" size={22} color={B.green} />
          </Pressable>
        </View>
        <View style={styles.weekRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {WEEK_ORDER.map((d) => (
            <Text key={d} style={styles.weekday}>
              {DAY_SHORT[d][0]}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              if (!date) return <View key={di} style={styles.cell} />;
              const w = schedule.get(date.getDay());
              const i = w ? names.indexOf(w) : -1;
              const runs = eventsOn(date).length;
              const isToday = sameDay(date, today);
              const isSel = sameDay(date, selected);
              return (
                <Pressable
                  key={di}
                  onPress={() => setSelected(date)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${format(date, 'EEEE, MMMM d')}${isToday ? ', today' : ''}: ${
                    w ?? 'rest day'
                  }${runs ? `, ${runs} run${runs === 1 ? '' : 's'}` : ''}`}
                  style={[styles.cell, isSel && styles.cellSelected]}
                >
                  <Text style={[styles.date, isToday && styles.dateToday, isSel && styles.dateSelected]}>
                    {date.getDate()}
                  </Text>
                  <View style={styles.marks}>
                    {i >= 0 ? <View style={[styles.bar, { backgroundColor: isSel ? '#fff' : WORKOUT_COLORS[i] }]} /> : null}
                    {runs ? <View style={[styles.dot, isSel && { backgroundColor: '#fff' }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        {schedule.size ? (
          <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {names.map((n, i) => (
              <View key={n} style={styles.legendItem}>
                <View style={[styles.bar, { backgroundColor: WORKOUT_COLORS[i] }]} />
                <Text style={styles.legendText}>{n}</Text>
              </View>
            ))}
            {runsOn ? (
              <View style={styles.legendItem}>
                <View style={styles.dot} />
                <Text style={styles.legendText}>Run</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </CardBox>

      <SectionHeader title={sameDay(selected, today) ? `Today · ${format(selected, 'EEE, MMM d')}` : format(selected, 'EEEE, MMM d')} />
      {workout ? (
        <>
          <WeightNote latest={latest} />
          <CardBox style={styles.workoutCard}>
            <Text style={styles.workoutTitle}>{workout.name}</Text>
            <Text style={[cardStyles.muted, { marginBottom: 8 }]}>About 50–60 min</Text>
            <WorkoutExercises v={v} workout={workout} bodyweight={latest?.bodyweight ?? null} />
          </CardBox>
          <CoachExtras v={v} assignments={assignments} bodyweight={latest?.bodyweight ?? null} />
        </>
      ) : (
        <CardBox style={styles.restCard}>
          <Text style={styles.body}>
            {schedule.size ? 'Rest day.' : 'Pick your 3 days above to see your workouts here.'}
          </Text>
          {schedule.size ? (
            <InfoLink label="Easy cardio on 1–2 rest days" onPress={() => explain(v.explainer('cardio'))} />
          ) : null}
        </CardBox>
      )}
      {!latest && workout ? (
        <Text style={cardStyles.muted}>Do your first benchmark and these will be built around your results.</Text>
      ) : null}

      {selectedEvents.length ? (
        <>
          <SectionHeader title="Runs" />
          <CardBox>
            {selectedEvents.map((e, i) => (
              <EventRow key={e.id} event={e} first={i === 0} />
            ))}
          </CardBox>
        </>
      ) : null}
    </ScrollView>
  );
}

/** "Grip & Cardio Day" → "Grip": fits under a weekday. */
function shortName(workout: string): string {
  return workout.split(/[\s&]/)[0];
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 40 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  hint: { color: B.goldText, fontSize: 13, fontWeight: '600' },
  pickerCard: { paddingVertical: 12, gap: 10 },
  dayRow: { flexDirection: 'row', gap: 4 },
  day: {
    flex: 1,
    minHeight: TAP + 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: B.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: B.surface,
  },
  dayText: { fontSize: 14, fontWeight: '700', color: B.text },
  dayWorkout: { fontSize: 11, color: B.muted, marginTop: 1 },
  dayTextOn: { color: '#FFFFFF' },
  monthCard: { paddingVertical: 8 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  monthArrow: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '700', color: B.text },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: B.muted, fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  cell: { flex: 1, minHeight: TAP + 4, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 3 },
  cellSelected: { backgroundColor: B.green },
  date: { fontSize: 15, color: B.text, fontVariant: ['tabular-nums'] },
  dateToday: { fontWeight: '800', color: B.green, textDecorationLine: 'underline' },
  dateSelected: { color: '#FFFFFF', textDecorationLine: 'none' },
  marks: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 5 },
  bar: { width: 14, height: 4, borderRadius: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: B.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: B.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 12, color: B.muted },
  workoutCard: { paddingVertical: 12 },
  workoutTitle: { fontSize: 18, fontWeight: '700', color: B.text },
  restCard: { paddingVertical: 12, gap: 4 },
});
