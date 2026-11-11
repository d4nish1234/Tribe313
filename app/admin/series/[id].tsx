import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ActivityIndicator, Dialog, HelperText, Portal, Switch, Text, TextInput } from 'react-native-paper';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';
import { useEventSeries } from '@/src/hooks/useEventSeries';
import { useNow } from '@/src/hooks/useEvents';
import { AppButton } from '@/src/components/AppButton';
import { CardBox, CardRow, SectionHeader, cardStyles } from '@/src/components/Cards';
import { pickOne } from '@/src/lib/picker';
import { describeRepeat, formatTimeOfDay, upcomingOccurrences, type SeriesRule } from '@/src/lib/recurrence';
import { choiceFromSeries, fitChoice, repeatChoices, ruleFromForm, type RepeatChoice } from '@/src/lib/seriesForm';
import type { EventSeries } from '@/src/types';

/** Create (id = 'new') or edit a recurring event. Opened from the Admin screen. */
export default function SeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { isAdmin } = useAuth();
  const { loading, series } = useEventSeries(isNew ? undefined : id);

  if (!isAdmin) return <Redirect href="/" />;
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!isNew && !series) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={cardStyles.muted}>This recurring event was deleted.</Text>
        <AppButton variant="text" onPress={() => router.back()}>
          Go back
        </AppButton>
      </View>
    );
  }
  // Keyed so the form starts from the saved series once, not on every live update.
  return <SeriesForm key={series?.id ?? 'new'} series={series} />;
}

/** A Date whose local clock reads `date` `time`: the pickers show device time, we store Toronto time. */
function toPickerDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

function defaultStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); // next Saturday
  d.setHours(8, 0, 0, 0);
  return d;
}

function SeriesForm({ series }: { series: EventSeries | null }) {
  const { firebaseUser } = useAuth();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const [title, setTitle] = useState(series?.title ?? '');
  const [description, setDescription] = useState(series?.description ?? '');
  const [label, setLabel] = useState(series?.location.label ?? '');
  const [address, setAddress] = useState(series?.location.address ?? '');
  const [start, setStart] = useState(() =>
    series ? toPickerDate(series.startDate, series.timeOfDay) : defaultStart(),
  );
  const [pickedChoice, setChoice] = useState<RepeatChoice>(series ? choiceFromSeries(series) : 'weekly');
  const [hasEnd, setHasEnd] = useState(!!series?.endDate);
  const [end, setEnd] = useState(() =>
    series?.endDate ? toPickerDate(series.endDate, '00:00') : new Date(start.getTime() + 90 * 86_400_000),
  );
  // Android pickers are dialogs and do date and time separately.
  const [showStart, setShowStart] = useState<'date' | 'time' | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const choices = useMemo(() => repeatChoices(start), [start]);
  // A new start date can rule out "last Saturday" (or make it the only monthly option).
  const choice = fitChoice(pickedChoice, choices);

  const skipDates = series?.skipDates;
  const rule: SeriesRule = useMemo(
    () => ruleFromForm({ start, choice, end: hasEnd ? end : null, skipDates }),
    [start, choice, hasEnd, end, skipDates],
  );
  const preview = useMemo(() => upcomingOccurrences(rule, now, 400).slice(0, 3), [rule, now]);

  const pickRepeat = async () => {
    const picked = await pickOne({
      title: 'Repeats',
      items: choices.map((c) => ({ id: c.id, title: c.label })),
      selected: [choice],
    });
    if (picked) setChoice(picked as RepeatChoice);
  };

  async function save() {
    setErr(null);
    if (!title.trim() || !address.trim()) return setErr('Title and address are required.');
    if (rule.endDate && rule.endDate < rule.startDate)
      return setErr('The end date is before the first date.');
    setBusy(true);
    try {
      let location = series?.location ?? { label: '', address: '', lat: 0, lng: 0 };
      if (!series || address.trim() !== series.location.address) {
        let formatted = address.trim();
        let lat = 0;
        let lng = 0;
        try {
          const res = await geocodeAddress({ address: formatted });
          lat = res.data.lat;
          lng = res.data.lng;
          formatted = res.data.formattedAddress || formatted;
        } catch {
          /* save without coordinates; the map is hidden */
        }
        location = { label: '', address: formatted, lat, lng };
      }
      location = { ...location, label: label.trim() || location.address };

      const data = {
        title: title.trim(),
        description: description.trim(),
        location,
        repeat: rule.repeat,
        startDate: rule.startDate,
        timeOfDay: rule.timeOfDay,
        monthlyWeek: rule.monthlyWeek ?? null,
        endDate: rule.endDate ?? null,
        updatedAt: serverTimestamp(),
      };
      if (series) {
        await updateDoc(doc(db, 'eventSeries', series.id), data);
      } else {
        await addDoc(collection(db, 'eventSeries'), {
          ...data,
          skipDates: [],
          createdBy: firebaseUser!.uid,
          createdAt: serverTimestamp(),
        });
      }
      router.back();
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!series) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'eventSeries', series.id));
      setConfirmDelete(false);
      router.back();
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  const iosInline = Platform.OS === 'ios';

  return (
    <>
      <Stack.Screen options={{ title: series ? 'Recurring event' : 'New recurring event' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[cardStyles.content, { paddingBottom: 40 + insets.bottom }]}
      >
        <TextInput label="Title" value={title} onChangeText={setTitle} />
        <TextInput label="Description" value={description} onChangeText={setDescription} multiline />
        <TextInput label="Location label (e.g. 'The Rec Center')" value={label} onChangeText={setLabel} />
        <TextInput label="Address" value={address} onChangeText={setAddress} multiline />

        <SectionHeader title="When (Toronto time)" />
        <CardBox>
          <CardRow
            first
            title="First one"
            right={
              iosInline ? (
                <DateTimePicker
                  value={start}
                  mode="datetime"
                  minuteInterval={5}
                  onChange={(_, d) => d && setStart(d)}
                />
              ) : (
                <Text style={cardStyles.muted}>{format(start, 'EEE, MMM d · h:mm a')}</Text>
              )
            }
            onPress={iosInline ? undefined : () => setShowStart('date')}
          />
          <CardRow
            title="Repeats"
            right={<Text style={cardStyles.muted}>{describeRepeat(rule)}</Text>}
            onPress={pickRepeat}
          />
          <CardRow
            title="Ends"
            subtitle={hasEnd ? undefined : 'Never'}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {hasEnd && iosInline ? (
                  <DateTimePicker value={end} mode="date" onChange={(_, d) => d && setEnd(d)} />
                ) : null}
                {hasEnd && !iosInline ? (
                  <AppButton variant="text" onPress={() => setShowEnd(true)}>
                    {format(end, 'MMM d, yyyy')}
                  </AppButton>
                ) : null}
                <Switch value={hasEnd} onValueChange={setHasEnd} accessibilityLabel="Has an end date" />
              </View>
            }
          />
        </CardBox>
        {/* Android shows the pickers as dialogs. */}
        {showStart ? (
          <DateTimePicker
            value={start}
            mode={showStart}
            minuteInterval={5}
            onChange={(e, d) => {
              if (d) setStart(d);
              setShowStart(e.type === 'set' && showStart === 'date' ? 'time' : null);
            }}
          />
        ) : null}
        {showEnd ? (
          <DateTimePicker
            value={end}
            mode="date"
            onChange={(_, d) => {
              setShowEnd(false);
              if (d) setEnd(d);
            }}
          />
        ) : null}

        <Text style={cardStyles.muted}>
          {preview.length
            ? `Next: ${preview.map((o) => format(parseISO(o.date), 'MMM d')).join(', ')} at ${formatTimeOfDay(rule.timeOfDay)}`
            : 'No dates left to come with these settings.'}
          {'\n'}
          Events appear in the Events tab 5 weeks ahead. Everyone is notified once when it’s created, and the
          evening before each one.
        </Text>

        {err ? <HelperText type="error">{err}</HelperText> : null}
        <AppButton onPress={save} loading={busy} disabled={busy}>
          {series ? 'Save changes' : 'Create recurring event'}
        </AppButton>
        {series ? (
          <AppButton variant="text" tone="danger" onPress={() => setConfirmDelete(true)} disabled={busy}>
            Delete recurring event
          </AppButton>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>Delete recurring event?</Dialog.Title>
          <Dialog.Content>
            <Text>
              No more “{series?.title}” events will be added. Upcoming ones nobody has RSVPed to are removed;
              ones with RSVPs stay. Past events aren’t touched.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={() => setConfirmDelete(false)} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton variant="text" tone="danger" onPress={remove} loading={busy}>
              Delete
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
