import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAuthGate } from '@/src/hooks/useAuthGate';
import { markOnboarded } from '@/src/lib/onboarding';
import { WORKOUT_DAY_COUNT, normalizeDays, pickingHint } from '@/src/lib/schedule';
import { AppButton } from '@/src/components/AppButton';
import { BrandLogo } from '@/src/components/BrandLogo';
import { CardBox, CardRow, SectionHeader, cardStyles } from '@/src/components/Cards';
import { useBenchmarkProfile } from '@/src/benchmark/hooks';
import { saveOnboarding, settleWithin } from '@/src/benchmark/data';
import { latestVersion } from '@/src/benchmark/registry';
import { buildWorkouts } from '@/src/benchmark/engine/workouts';
import { formatFtIn } from '@/src/benchmark/engine/format';
import { PickerSheet } from '@/src/benchmark/components/PickerSheet';
import { DayPicker } from '@/src/benchmark/components/WorkoutDays';
import { B } from '@/src/benchmark/theme';

/**
 * First-run setup, shown once per account on this phone (the flag is in
 * AsyncStorage, see src/lib/onboarding.ts). Everything is optional: "Done"
 * saves whatever was set, "Skip for now" saves nothing, and both go to Training.
 *
 * Later steps (equipment, choosing a coach) are in docs/backlog.md.
 */
export default function Onboarding() {
  useAuthGate();
  const { firebaseUser, appUser } = useAuth();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();
  const { loading, profile } = useBenchmarkProfile(uid);
  const v = latestVersion();
  const names = useMemo(() => buildWorkouts(v, null).map((w) => w.name), [v]);

  // Undefined until changed here, so a new phone or reinstall (which shows
  // onboarding again) starts from what's already saved.
  const [heightEdit, setHeightIn] = useState<number | null | undefined>(undefined);
  const [daysEdit, setDays] = useState<number[] | undefined>(undefined);
  const heightIn = heightEdit !== undefined ? heightEdit : (profile?.heightIn ?? null);
  const days = daysEdit ?? normalizeDays(profile?.workoutDays);
  const [full, setFull] = useState(false);
  const [pickingHeight, setPickingHeight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (save: boolean) => {
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      if (save) {
        const name = appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '';
        const savedDays = normalizeDays(profile?.workoutDays);
        await settleWithin(saveOnboarding(uid, name, {
          heightIn: heightIn !== (profile?.heightIn ?? null) ? heightIn : null,
          // Only a full set of 3, and only if it changed.
          workoutDays:
            days.length === WORKOUT_DAY_COUNT && days.join() !== savedDays.join() ? days : null,
        }));
      }
      await markOnboarded(uid);
      router.replace('/training');
    } catch (e: any) {
      setError(`Couldn’t save: ${e?.message ?? e}. Try again, or skip for now.`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const hint = full ? 'You’ve picked 3 days. Tap one of them to unpick it first.' : days.length ? pickingHint(days) : null;
  const partial = days.length > 0 && days.length < WORKOUT_DAY_COUNT;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <BrandLogo style={{ paddingTop: 20 + insets.top }} />
        <View style={cardStyles.content}>
          <Text variant="headlineSmall" accessibilityRole="header">
            Welcome{appUser ? `, ${appUser.firstName}` : ''}
          </Text>
          <Text style={styles.body}>
            A couple of things to set up your training. Everything is optional, and you can change it later.
          </Text>

          <SectionHeader title="Your height" />
          <CardBox>
            <CardRow
              first
              title="Height"
              subtitle="Sets your broad jump target"
              right={<Text style={heightIn != null ? styles.value : cardStyles.muted}>{heightIn != null ? formatFtIn(heightIn) : 'Not set'}</Text>}
              onPress={() => setPickingHeight(true)}
              accessibilityHint="Opens a picker"
            />
          </CardBox>

          <SectionHeader title="Your workout days" />
          <CardBox style={styles.daysCard}>
            <Text style={cardStyles.muted}>
              Pick 3 days you can commit to. Your workouts go on them in order: {names.join(', then ')}.
            </Text>
            <DayPicker
              days={days}
              names={names}
              onChange={(d) => {
                setFull(false);
                setDays(d);
              }}
              onFull={() => setFull(true)}
              disabled={saving}
            />
            {hint ? (
              <Text style={partial || full ? styles.hint : cardStyles.muted} accessibilityLiveRegion="polite">
                {hint}
                {partial ? ' Days are saved once all 3 are picked.' : ''}
              </Text>
            ) : null}
          </CardBox>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <AppButton onPress={() => finish(true)} disabled={saving} loading={saving}>
          Done
        </AppButton>
        <AppButton variant="text" onPress={() => finish(false)} disabled={saving}>
          Skip for now
        </AppButton>
      </View>

      <PickerSheet
        spec={pickingHeight ? v.picker('height') : null}
        visible={pickingHeight}
        value={heightIn}
        fallback={v.pickerDefault('height')}
        onDone={(h) => {
          setHeightIn(h);
          setPickingHeight(false);
        }}
        onClose={() => setPickingHeight(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: B.background },
  body: { fontSize: 16, color: B.text, lineHeight: 22 },
  value: { fontSize: 16, fontWeight: '600', color: B.text },
  daysCard: { paddingVertical: 12, gap: 10 },
  hint: { color: B.goldText, fontSize: 13, fontWeight: '600' },
  error: { color: B.danger, fontSize: 14 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
    backgroundColor: B.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: B.border,
    width: '100%',
    alignSelf: 'center',
  },
});
