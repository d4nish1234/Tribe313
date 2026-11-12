import { useMemo, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timestamp, addDoc, collection, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';
import { AppButton } from '@/src/components/AppButton';
import { CardBox, CardRow, cardStyles } from '@/src/components/Cards';
import {
  addressChanged,
  eventChanges,
  formFromEvent,
  locationToSave,
  validateEvent,
  type EditableEvent,
} from '@/src/lib/eventForm';
import type { EventDoc } from '@/src/types';

const toEditable = (e: EventDoc): EditableEvent => ({
  title: e.title,
  description: e.description,
  location: e.location,
  startsAt: e.startsAt.toMillis(),
});

/**
 * Create (`event` null) or edit a one-off event. Starts from the event as it
 * was when opened; key it by event id so live updates don't reset what the
 * admin is typing. Recurring dates are edited through their series instead
 * (see `editTarget` in src/lib/eventForm.ts).
 */
export function EventForm({ event }: { event: EventDoc | null }) {
  const { firebaseUser } = useAuth();
  const insets = useSafeAreaInsets();
  const before = useMemo(() => (event ? toEditable(event) : null), [event]);
  const start = before ? formFromEvent(before) : null;

  const [title, setTitle] = useState(start?.title ?? '');
  const [description, setDescription] = useState(start?.description ?? '');
  const [label, setLabel] = useState(start?.label ?? '');
  const [address, setAddress] = useState(start?.address ?? '');
  const [when, setWhen] = useState(() => new Date(start?.startsAt ?? Date.now() + 60 * 60 * 1000));
  // Android pickers are dialogs and do date and time separately.
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const values = { title, description, label, address, startsAt: when.getTime() };
  // Nothing to save until something changes (the address check covers a new address).
  const dirty = !before || eventChanges(before, values, locationToSave(before, values, null)).any;

  async function save() {
    setErr(null);
    const invalid = validateEvent(values);
    if (invalid) return setErr(invalid);
    setBusy(true);
    try {
      let found: { lat: number; lng: number; formattedAddress?: string } | null = null;
      if (addressChanged(before, values)) {
        try {
          found = (await geocodeAddress({ address: values.address.trim() })).data;
        } catch {
          /* save without coordinates; the map is hidden */
        }
      }
      const location = locationToSave(before, values, found);

      if (event && before) {
        const { fields, timeChanged } = eventChanges(before, values, location);
        await updateDoc(doc(db, 'events', event.id), {
          ...fields,
          ...(timeChanged
            ? // A moved event gets its evening-before reminder for the new date.
              { startsAt: Timestamp.fromDate(when), reminderSentAt: deleteField() }
            : {}),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'events'), {
          title: values.title.trim(),
          description: values.description.trim(),
          location,
          startsAt: Timestamp.fromDate(when),
          createdBy: firebaseUser!.uid,
          createdAt: serverTimestamp(),
        });
      }
      router.back();
    } catch (e: any) {
      setErr(
        e?.code === 'not-found' ? 'This event was deleted.' : (e?.message ?? 'Could not save the event.'),
      );
    } finally {
      setBusy(false);
    }
  }

  const iosInline = Platform.OS === 'ios';

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[cardStyles.content, { paddingBottom: 40 + insets.bottom }]}
    >
      <TextInput label="Title" value={title} onChangeText={setTitle} />
      <TextInput label="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput label="Location label (e.g. 'The Rec Center')" value={label} onChangeText={setLabel} />
      <TextInput label="Address" value={address} onChangeText={setAddress} multiline />

      <CardBox>
        <CardRow
          first
          title="Date & time"
          right={
            iosInline ? (
              <DateTimePicker value={when} mode="datetime" minuteInterval={5} onChange={(_, d) => d && setWhen(d)} />
            ) : (
              <Text style={cardStyles.muted}>{format(when, 'EEE, MMM d · h:mm a')}</Text>
            )
          }
          onPress={iosInline ? undefined : () => setShowPicker('date')}
        />
      </CardBox>
      {showPicker ? (
        <DateTimePicker
          value={when}
          mode={showPicker}
          minuteInterval={5}
          onChange={(e, d) => {
            if (d) setWhen(d);
            setShowPicker(e.type === 'set' && showPicker === 'date' ? 'time' : null);
          }}
        />
      ) : null}
      {event && when.getTime() !== before?.startsAt ? (
        <Text style={cardStyles.muted}>
          People who already RSVPed aren’t told about the new time; the evening-before reminder will use it.
        </Text>
      ) : null}

      {err ? <HelperText type="error">{err}</HelperText> : null}
      <AppButton onPress={save} loading={busy} disabled={busy || !dirty}>
        {event ? (dirty ? 'Save changes' : 'No changes') : 'Create event'}
      </AppButton>
    </ScrollView>
  );
}
