import { useState } from 'react';
import { Alert, View } from 'react-native';
import { ActivityIndicator, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';
import { useCarpoolLocations, type CarpoolLocation } from '@/src/hooks/useCarpoolLocations';
import { CardBox, CardRow, SectionHeader, cardStyles } from '@/src/components/Cards';
import { palette } from '@/src/theme';
import { AppButton } from '@/src/components/AppButton';

/** Pickup points shown on event maps: add, edit, delete. Part of the Admin screen. */
export function CarpoolSection() {
  const { loading, locations } = useCarpoolLocations();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<CarpoolLocation | null>(null);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<CarpoolLocation | null>(null);

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
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, 'carpoolLocations', toDelete.id));
      setToDelete(null);
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionHeader
        title="Carpool locations"
        right={
          <AppButton variant="text" icon="plus" onPress={openAdd} accessibilityLabel="Add carpool location">
            Add
          </AppButton>
        }
      />
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : locations.length === 0 ? (
        <Text style={cardStyles.muted}>No carpool locations yet. Tap Add to create one.</Text>
      ) : (
        <CardBox>
          {locations.map((item, i) => (
            <CardRow
              key={item.id}
              first={i === 0}
              title={item.label}
              subtitle={item.address}
              right={
                <View style={{ flexDirection: 'row' }}>
                  <IconButton
                    icon="pencil-outline"
                    accessibilityLabel={`Edit ${item.label}`}
                    onPress={() => openEdit(item)}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    iconColor={palette.danger}
                    accessibilityLabel={`Delete ${item.label}`}
                    onPress={() => setToDelete(item)}
                  />
                </View>
              }
            />
          ))}
        </CardBox>
      )}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>{editing ? 'Edit location' : 'Add carpool location'}</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <TextInput label="Label (e.g. Masjid Parking Lot)" value={label} onChangeText={setLabel} />
            <TextInput label="Address" value={address} onChangeText={setAddress} multiline />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={closeDialog} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton
              variant="text"
              onPress={save}
              loading={busy}
              disabled={!label.trim() || !address.trim()}
            >
              {editing ? 'Update' : 'Add'}
            </AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!toDelete} onDismiss={() => setToDelete(null)}>
          <Dialog.Title>Delete location?</Dialog.Title>
          <Dialog.Content>
            <Text>“{toDelete?.label}” will no longer show as a pickup point on event maps.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={() => setToDelete(null)} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton variant="text" tone="danger" onPress={confirmDelete} loading={busy}>
              Delete
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
