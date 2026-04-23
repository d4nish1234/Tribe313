import { useState } from 'react';
import { FlatList, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { Redirect } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';
import { useCarpoolLocations, type CarpoolLocation } from '@/src/hooks/useCarpoolLocations';

export default function CarpoolAddresses() {
  const { isAdmin } = useAuth();
  const { loading, locations } = useCarpoolLocations();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<CarpoolLocation | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isAdmin) return <Redirect href="/" />;

  function openAdd() {
    setEditing(null);
    setLabel('');
    setAddress('');
    setDialogVisible(true);
  }

  function openEdit(loc: CarpoolLocation) {
    setEditing(loc);
    setLabel(loc.label);
    setAddress(loc.address);
    setDialogVisible(true);
  }

  function closeDialog() {
    setDialogVisible(false);
    setEditing(null);
  }

  async function save() {
    const trimmedLabel = label.trim();
    const trimmedAddress = address.trim();
    if (!trimmedLabel || !trimmedAddress) return;
    setBusy(true);
    try {
      let lat = editing?.lat ?? 0;
      let lng = editing?.lng ?? 0;
      if (trimmedAddress !== editing?.address) {
        try {
          const res = await geocodeAddress({ address: trimmedAddress });
          lat = res.data.lat;
          lng = res.data.lng;
        } catch {
          /* save without coords */
        }
      }

      if (editing) {
        await updateDoc(doc(db, 'carpoolLocations', editing.id), {
          label: trimmedLabel,
          address: trimmedAddress,
          lat,
          lng,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'carpoolLocations'), {
          label: trimmedLabel,
          address: trimmedAddress,
          lat,
          lng,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      closeDialog();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, 'carpoolLocations', id));
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={locations}
        keyExtractor={(l) => l.id}
        ListEmptyComponent={
          <Text style={{ padding: 24, textAlign: 'center', opacity: 0.7 }}>
            No carpool locations yet. Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <List.Item
            title={item.label}
            description={item.address}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton icon="pencil-outline" onPress={() => openEdit(item)} />
                <IconButton icon="trash-can-outline" onPress={() => remove(item.id)} />
              </View>
            )}
          />
        )}
      />

      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 24 }}
        onPress={openAdd}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>{editing ? 'Edit location' : 'Add carpool location'}</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <TextInput
              label="Label (e.g. Masjid Parking Lot)"
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              label="Address"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button onPress={save} loading={busy} disabled={!label.trim() || !address.trim()}>
              {editing ? 'Update' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
