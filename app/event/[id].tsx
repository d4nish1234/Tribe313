import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  IconButton,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { db } from '@/src/firebase/config';
import { geocodeAddress } from '@/src/firebase/fn';
import { useEvent } from '@/src/hooks/useEvents';
import { useRsvps } from '@/src/hooks/useRsvps';
import { useRides } from '@/src/hooks/useRides';
import { useMembers } from '@/src/hooks/useMembers';
import { RsvpPicker } from '@/src/components/RsvpPicker';
import { RideCard } from '@/src/components/RideCard';
import { EventMap } from '@/src/components/EventMap';
import type { RsvpStatus } from '@/src/types';

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const { event, loading } = useEvent(id);
  const { rsvps } = useRsvps(id);
  const { rides } = useRides(id);
  const { members } = useMembers();

  const [rideDialog, setRideDialog] = useState(false);
  const [pickup, setPickup] = useState('');
  const [rideBusy, setRideBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const myRsvp = useMemo(() => rsvps.find((r) => r.uid === firebaseUser?.uid), [rsvps, firebaseUser?.uid]);
  const nameFor = (uid: string) => {
    const m = members.find((x) => x.uid === uid);
    return m ? `${m.firstName} ${m.lastName}` : 'Member';
  };
  const memberPins = members
    .filter((m) => m.shareLocation && m.addressGeo)
    .map((m) => ({ uid: m.uid, name: `${m.firstName} ${m.lastName}`, lat: m.addressGeo!.lat, lng: m.addressGeo!.lng }));

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!event || !firebaseUser) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  async function setRsvp(status: RsvpStatus) {
    if (!firebaseUser || !event) return;
    await setDoc(
      doc(db, 'events', event.id, 'rsvps', firebaseUser.uid),
      { status, attended: false, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  async function createRide() {
    if (!firebaseUser || !event) return;
    const src = pickup.trim() || appUser?.address?.trim() || '';
    if (!src) {
      Alert.alert('Pickup required', 'Enter a pickup address or add your home address in Settings.');
      return;
    }
    setRideBusy(true);
    try {
      let geo: { lat: number; lng: number } | null = null;
      if (src === appUser?.address?.trim() && appUser?.addressGeo) {
        geo = appUser.addressGeo;
      } else {
        try {
          const res = await geocodeAddress({ address: src });
          geo = { lat: res.data.lat, lng: res.data.lng };
        } catch {
          /* allow ride without coords */
        }
      }
      await addDoc(collection(db, 'events', event.id, 'rides'), {
        requesterUid: firebaseUser.uid,
        pickup: { label: src, address: src, lat: geo?.lat ?? 0, lng: geo?.lng ?? 0 },
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setRideDialog(false);
      setPickup('');
      setSnack('Ride requested');
    } finally {
      setRideBusy(false);
    }
  }

  async function offerRide(rideId: string) {
    if (!firebaseUser || !event) return;
    await updateDoc(doc(db, 'events', event.id, 'rides', rideId), {
      status: 'matched',
      driverUid: firebaseUser.uid,
      matchedAt: serverTimestamp(),
    });
    setSnack('Ride offered');
  }

  async function cancelRide(rideId: string) {
    if (!event) return;
    await updateDoc(doc(db, 'events', event.id, 'rides', rideId), { status: 'cancelled' });
  }

  async function deleteEvent() {
    if (!event) return;
    await deleteDoc(doc(db, 'events', event.id));
    router.back();
  }

  async function toggleAttended(uid: string, next: boolean) {
    if (!event) return;
    await setDoc(
      doc(db, 'events', event.id, 'rsvps', uid),
      { attended: next, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  const yesCount = rsvps.filter((r) => r.status === 'yes').length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text variant="headlineSmall">{event.title}</Text>
        <Text style={{ opacity: 0.75 }}>
          {format(event.startsAt.toDate(), 'PPPPp')}
        </Text>
        <Text style={{ opacity: 0.75 }}>{event.location?.label}</Text>
        {event.description ? <Text style={{ marginTop: 8 }}>{event.description}</Text> : null}
      </View>

      {event.location?.lat ? (
        <EventMap event={event} rides={rides} memberPins={memberPins} viewerUid={firebaseUser.uid} />
      ) : null}

      <Divider />

      <Text variant="titleMedium">Your RSVP</Text>
      <RsvpPicker value={myRsvp?.status} onChange={setRsvp} />
      <Text style={{ opacity: 0.7 }}>{yesCount} going</Text>

      <Divider />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="titleMedium">Rides</Text>
        <Button mode="contained-tonal" onPress={() => setRideDialog(true)}>
          I need a ride
        </Button>
      </View>
      {rides.length === 0 ? (
        <Text style={{ opacity: 0.7 }}>No ride requests yet.</Text>
      ) : (
        rides.map((r) => (
          <RideCard
            key={r.id}
            ride={r}
            requesterName={nameFor(r.requesterUid)}
            driverName={r.driverUid ? nameFor(r.driverUid) : undefined}
            canOffer={r.requesterUid !== firebaseUser.uid}
            canCancel={r.requesterUid === firebaseUser.uid || isAdmin}
            onOffer={() => offerRide(r.id)}
            onCancel={() => cancelRide(r.id)}
          />
        ))
      )}

      {isAdmin && (
        <>
          <Divider />
          <Text variant="titleMedium">Admin · Attendance</Text>
          {rsvps
            .filter((r) => r.status === 'yes')
            .map((r) => (
              <Card key={r.uid} style={{ marginBottom: 8 }}>
                <Card.Title
                  title={nameFor(r.uid)}
                  right={() => (
                    <IconButton
                      icon={r.attended ? 'check-circle' : 'circle-outline'}
                      onPress={() => toggleAttended(r.uid, !r.attended)}
                    />
                  )}
                />
              </Card>
            ))}
          <Button mode="outlined" textColor="#D7263D" onPress={deleteEvent}>
            Delete event
          </Button>
        </>
      )}

      <Portal>
        <Dialog visible={rideDialog} onDismiss={() => setRideDialog(false)}>
          <Dialog.Title>Request a ride</Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <Text>Pickup address (defaults to your home address).</Text>
            <TextInput
              label="Pickup"
              value={pickup}
              onChangeText={setPickup}
              placeholder={appUser?.address ?? 'Enter address'}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRideDialog(false)} disabled={rideBusy}>
              Cancel
            </Button>
            <Button onPress={createRide} loading={rideBusy}>
              Request
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
