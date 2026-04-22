import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  Portal,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { auth, db } from '@/src/firebase/config';
import { geocodeAddress, selfDeleteAccount } from '@/src/firebase/fn';
import { DangerZone } from '@/src/components/DangerZone';

export default function Settings() {
  const { appUser, firebaseUser } = useAuth();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notify, setNotify] = useState(true);
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) return;
    setFirst(appUser.firstName ?? '');
    setLast(appUser.lastName ?? '');
    setPhone(appUser.phone ?? '');
    setAddress(appUser.address ?? '');
    setNotify(appUser.notificationsEnabled ?? true);
    setShare(appUser.shareLocation ?? false);
  }, [appUser?.uid]);

  if (!appUser || !firebaseUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  async function save() {
    setSaving(true);
    try {
      const ref = doc(db, 'users', firebaseUser!.uid);
      const patch: Record<string, unknown> = {
        firstName: first.trim(),
        lastName: last.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notificationsEnabled: notify,
        shareLocation: share,
        updatedAt: serverTimestamp(),
      };

      if (address.trim() && address.trim() !== appUser?.address) {
        try {
          const res = await geocodeAddress({ address: address.trim() });
          patch.addressGeo = { lat: res.data.lat, lng: res.data.lng };
        } catch {
          // ignore geocoding failures — address still saved as string
        }
      } else if (!address.trim()) {
        patch.addressGeo = null;
      }

      await updateDoc(ref, patch as any);
      setSnack('Saved');
    } catch (e: any) {
      console.error('[settings] save failed:', e?.code, e?.message);
      setSnack(`Save failed: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setDeleteErr(null);
    setDeleting(true);
    try {
      const cred = EmailAuthProvider.credential(firebaseUser!.email!, password);
      await reauthenticateWithCredential(firebaseUser!, cred);
      await selfDeleteAccount();
      // callable deletes auth user; sign out for cleanliness
      await signOut(auth);
    } catch (e: any) {
      setDeleteErr(e.message ?? 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="titleMedium">Profile</Text>
      <TextInput label="First name" value={first} onChangeText={setFirst} />
      <TextInput label="Last name" value={last} onChangeText={setLast} />
      <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput label="Home address" value={address} onChangeText={setAddress} multiline />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text>Push notifications</Text>
          <HelperText type="info">Get pinged about new events, rides, and approvals.</HelperText>
        </View>
        <Switch value={notify} onValueChange={setNotify} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text>Share home location</Text>
          <HelperText type="info">
            Other members will see a pin at your home address on the members and event maps.
          </HelperText>
        </View>
        <Switch value={share} onValueChange={setShare} />
      </View>

      <Button mode="contained" onPress={save} loading={saving} style={{ marginTop: 8 }}>
        Save
      </Button>

      <Button onPress={() => signOut(auth)} style={{ marginTop: 8 }}>
        Sign out
      </Button>

      <DangerZone style={{ marginTop: 24 }}>
        <Text>Permanently delete your Tribe313 account and profile.</Text>
        <Button mode="outlined" textColor="#D7263D" onPress={() => setConfirmDelete(true)}>
          Delete my account
        </Button>
      </DangerZone>

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>Delete account</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <Text>Enter your password to confirm. This cannot be undone.</Text>
            <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {deleteErr ? <HelperText type="error">{deleteErr}</HelperText> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button onPress={performDelete} loading={deleting} textColor="#D7263D">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2000}>
        {snack}
      </Snackbar>
    </ScrollView>
  );
}
