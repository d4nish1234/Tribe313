import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { Timestamp, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';

export default function NewEvent() {
  const { firebaseUser, isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [when, setWhen] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Admins only.</Text>
      </View>
    );
  }

  async function submit() {
    setErr(null);
    if (!title.trim() || !address.trim()) {
      setErr('Title and address are required.');
      return;
    }
    setBusy(true);
    try {
      let lat = 0;
      let lng = 0;
      let formatted = address.trim();
      try {
        const res = await geocodeAddress({ address: address.trim() });
        lat = res.data.lat;
        lng = res.data.lng;
        formatted = res.data.formattedAddress || address.trim();
      } catch {
        /* allow creating without geocode, map will be hidden */
      }
      await addDoc(collection(db, 'events'), {
        title: title.trim(),
        description: description.trim(),
        location: { label: label.trim() || formatted, address: formatted, lat, lng },
        startsAt: Timestamp.fromDate(when),
        createdBy: firebaseUser!.uid,
        createdAt: serverTimestamp(),
      });
      router.back();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create event');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <TextInput label="Title" value={title} onChangeText={setTitle} />
      <TextInput label="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput label="Location label (e.g. 'The Rec Center')" value={label} onChangeText={setLabel} />
      <TextInput label="Address" value={address} onChangeText={setAddress} multiline />

      <Text variant="titleSmall">Date & time</Text>
      {Platform.OS === 'android' ? (
        <Button mode="outlined" onPress={() => setShowPicker(true)}>
          {when.toLocaleString()}
        </Button>
      ) : null}
      {showPicker && (
        <DateTimePicker
          value={when}
          mode="datetime"
          onChange={(_, d) => {
            if (Platform.OS === 'android') setShowPicker(false);
            if (d) setWhen(d);
          }}
        />
      )}

      {err ? <HelperText type="error">{err}</HelperText> : null}
      <Button mode="contained" onPress={submit} loading={busy}>
        Create event
      </Button>
    </ScrollView>
  );
}
