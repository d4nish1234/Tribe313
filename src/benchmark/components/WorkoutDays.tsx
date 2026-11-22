import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/src/contexts/AuthContext';
import { AppButton } from '@/src/components/AppButton';
import { CardBox, cardStyles } from '@/src/components/Cards';
import {
  DAY_LONG,
  DAY_SHORT,
  WEEK_ORDER,
  WORKOUT_DAY_COUNT,
  pickingHint,
  toggleDay,
  weekSchedule,
} from '@/src/lib/schedule';
import { saveWorkoutDays, settleWithin } from '../data';
import { B, TAP } from '../theme';
import { BottomSheet } from './BottomSheet';

/** One colour per workout, in workout order. */
const WORKOUT_COLORS = [B.green, B.goldText, '#4E6B58'] as const;

/** "Grip & Cardio Day" → "Grip": fits under a weekday. */
function shortWorkoutName(workout: string): string {
  return workout.split(/[\s&]/)[0];
}

/**
 * The Mon–Sun buttons for picking the 3 workout days. Each picked day shows
 * the workout it gets once all 3 are picked. Controlled: the caller keeps the
 * days and decides when to save. `onFull` runs when a 4th day is tapped.
 */
export function DayPicker({
  days,
  names,
  onChange,
  onFull,
  disabled,
}: {
  days: number[];
  names: readonly string[];
  onChange: (days: number[]) => void;
  onFull?: () => void;
  disabled?: boolean;
}) {
  const schedule = weekSchedule(days, names);
  return (
    <View style={styles.dayRow}>
      {WEEK_ORDER.map((d) => {
        const on = days.includes(d);
        const w = schedule.get(d);
        const i = w ? names.indexOf(w) : -1;
        return (
          <Pressable
            key={d}
            onPress={() => {
              const next = toggleDay(days, d);
              if (next.full) onFull?.();
              else onChange(next.days);
            }}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: !!disabled }}
            accessibilityLabel={`${DAY_LONG[d]}${w ? `, ${w}` : ''}`}
            style={[
              styles.day,
              on && { backgroundColor: i >= 0 ? WORKOUT_COLORS[i] : B.green, borderColor: 'transparent' },
            ]}
          >
            <Text style={[styles.dayText, on && styles.dayTextOn]} maxFontSizeMultiplier={1.3}>
              {DAY_SHORT[d]}
            </Text>
            <Text style={[styles.dayWorkout, on && styles.dayTextOn]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {w ? shortWorkoutName(w) : ' '}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const FULL_HINT = 'You’ve picked 3 days. Tap one of them to unpick it first.';

/** Bottom sheet for setting or changing the workout days. Saves to the member's profile. */
export function WorkoutDaysSheet({
  visible,
  onClose,
  saved,
  names,
}: {
  visible: boolean;
  onClose: () => void;
  saved: number[];
  names: readonly string[];
}) {
  const { firebaseUser, appUser } = useAuth();
  // Null: nothing changed yet, show what's saved. Cleared on close, so the
  // sheet always opens on the saved days.
  const [edit, setEdit] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const days = edit ?? saved;
  const close = () => {
    onClose();
    setEdit(null);
    setError(null);
  };

  const complete = days.length === WORKOUT_DAY_COUNT;
  const changed = days.join(',') !== saved.join(',');

  const save = async () => {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      const name = appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '';
      await settleWithin(saveWorkoutDays(uid, name, days));
      close();
    } catch (e: any) {
      setError(`Couldn’t save your days: ${e?.message ?? e}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const hint = error ?? pickingHint(days);
  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title="Your workout days"
      subtitle={`Pick 3 days you can commit to. Your workouts go on them in order: ${names.join(', then ')}.`}
      scroll={false}
      footer={
        <View style={styles.buttons}>
          <AppButton variant="secondary" style={styles.btn} onPress={close} disabled={saving}>
            Cancel
          </AppButton>
          <AppButton style={styles.btn} onPress={save} disabled={!complete || !changed || saving} loading={saving}>
            Save
          </AppButton>
        </View>
      }
    >
      <View style={styles.sheetBody}>
        <DayPicker
          days={days}
          names={names}
          onChange={(d) => {
            setError(null);
            setEdit(d);
          }}
          onFull={() => setError(FULL_HINT)}
          disabled={saving}
        />
        {hint ? (
          <Text style={error || !complete ? styles.hint : cardStyles.muted} accessibilityLiveRegion="polite">
            {hint}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

/**
 * "Set workout days" (a card asking for them) until 3 days are saved, then a
 * quieter "Edit workout days" link. Either opens the sheet. Used on Training.
 */
export function WorkoutDaysPrompt({ saved, names }: { saved: number[]; names: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const set = saved.length === WORKOUT_DAY_COUNT;
  return (
    <>
      {set ? (
        <AppButton variant="text" icon="calendar-edit" style={styles.editLink} onPress={() => setOpen(true)}>
          Edit workout days
        </AppButton>
      ) : (
        <CardBox style={styles.promptCard}>
          <Text style={styles.body}>Pick the 3 days you can train and your workouts will go on them.</Text>
          <AppButton variant="secondary" icon="calendar-check" onPress={() => setOpen(true)}>
            Set workout days
          </AppButton>
        </CardBox>
      )}
      <WorkoutDaysSheet visible={open} onClose={() => setOpen(false)} saved={saved} names={names} />
    </>
  );
}

const styles = StyleSheet.create({
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
  hint: { color: B.goldText, fontSize: 13, fontWeight: '600' },
  sheetBody: { gap: 10, marginTop: 16, marginBottom: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1 },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  promptCard: { paddingVertical: 12, gap: 10 },
  editLink: { alignSelf: 'flex-start', marginLeft: -12 },
});
