import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  IconButton,
  Portal,
  RadioButton,
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

type PickupMode = 'home' | 'carpool' | 'custom';

function resolveMode(address: string, home?: string, carpool?: string): PickupMode {
  if (home && address === home) return 'home';
  if (carpool && address === carpool) return 'carpool';
  return 'custom';
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const { event, loading } = useEvent(id);
  const { rsvps } = useRsvps(id);
  const { rides } = useRides(id);
  const { members } = useMembers();

  const [rideDialog, setRideDialog] = useState(false);
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [pickupMode, setPickupMode] = useState<PickupMode>('home');
  const [customPickup, setCustomPickup] = useState('');
  const [rideBusy, setRideBusy] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const myRsvp = useMemo(() => rsvps.find((r) => r.uid === firebaseUser?.uid), [rsvps, firebaseUser?.uid]);
  const myActiveRide = useMemo(
    () => rides.find((r) => r.requesterUid === firebaseUser?.uid && r.status !== 'cancelled'),
    [rides, firebaseUser?.uid],
  );

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

  function openRideDialog(rideId?: string) {
    if (rideId) {
      const ride = rides.find((r) => r.id === rideId);
      const currentAddress = ride?.pickup?.address ?? '';
      const mode = resolveMode(currentAddress, appUser?.address ?? undefined, appUser?.carpoolAddress ?? undefined);
      setPickupMode(mode);
      setCustomPickup(mode === 'custom' ? currentAddress : '');
      setEditingRideId(rideId);
    } else {
      const defaultMode: PickupMode = appUser?.address ? 'home' : appUser?.carpoolAddress ? 'carpool' : 'custom';
      setPickupMode(defaultMode);
      setCustomPickup('');
      setEditingRideId(null);
    }
    setRideDialog(true);
  }

  function resolvedPickup(): { address: string; geo: { lat: number; lng: number } | null } {
    if (pickupMode === 'home') {
      return { address: appUser?.address ?? '', geo: appUser?.addressGeo ?? null };
    }
    if (pickupMode === 'carpool') {
      return { address: appUser?.carpoolAddress ?? '', geo: appUser?.carpoolAddressGeo ?? null };
    }
    return { address: customPickup.trim(), geo: null };
  }

  async function submitRide() {
    if (!firebaseUser || !event) return;
    const { address: src, geo: cachedGeo } = resolvedPickup();
    if (!src) {
      setSnack('Enter a pickup address or save one in Settings.');
      return;
    }
    setRideBusy(true);
    try {
      let geo = cachedGeo;
      if (!geo) {
        try {
          const res = await geocodeAddress({ address: src });
          geo = { lat: res.data.lat, lng: res.data.lng };
        } catch {
          /* allow without coords */
        }
      }
      const pickup = { label: src, address: src, lat: geo?.lat ?? 0, lng: geo?.lng ?? 0 };

      if (editingRideId) {
        await updateDoc(doc(db, 'events', event.id, 'rides', editingRideId), { pickup });
        setSnack('Pickup updated');
      } else {
        await addDoc(collection(db, 'events', event.id, 'rides'), {
          requesterUid: firebaseUser.uid,
          pickup,
          status: 'open',
          createdAt: serverTimestamp(),
        });
        setSnack('Ride requested');
      }
      setRideDialog(false);
    } finally {
      setRideBusy(false);
    }
  }

  async function setRsvp(status: RsvpStatus) {
    if (!firebaseUser || !event) return;
    await setDoc(
      doc(db, 'events', event.id, 'rsvps', firebaseUser.uid),
      { status, attended: false, updatedAt: serverTimestamp() },
      { merge: true },
    );
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
        <Text style={{ opacity: 0.75 }}>{format(event.startsAt.toDate(), 'PPPPp')}</Text>
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
        {!myActiveRide && (
          <Button mode="contained-tonal" onPress={() => openRideDialog()}>
            I need a ride
          </Button>
        )}
      </View>

      {rides.length === 0 ? (
        <Text style={{ opacity: 0.7 }}>No ride requests yet.</Text>
      ) : (
        rides.map((r) => {
          const isOwner = r.requesterUid === firebaseUser.uid;
          return (
            <RideCard
              key={r.id}
              ride={r}
              requesterName={nameFor(r.requesterUid)}
              driverName={r.driverUid ? nameFor(r.driverUid) : undefined}
              canOffer={!isOwner}
              isOwner={isOwner}
              onOffer={!isOwner ? () => offerRide(r.id) : undefined}
              onEdit={isOwner ? () => openRideDialog(r.id) : undefined}
              onCancel={isOwner || isAdmin ? () => cancelRide(r.id) : undefined}
            />
          );
        })
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
          <Dialog.Title>{editingRideId ? 'Edit pickup' : 'Request a ride'}</Dialog.Title>
          <Dialog.Content style={{ gap: 4 }}>
            <RadioButton.Group value={pickupMode} onValueChange={(v) => setPickupMode(v as PickupMode)}>
              {appUser?.address ? (
                <RadioButton.Item
                  label={`Home — ${appUser.address}`}
                  value="home"
                  labelNumberOfLines={2}
                />
              ) : null}
              {appUser?.carpoolAddress ? (
                <RadioButton.Item
                  label={`Carpool — ${appUser.carpoolAddress}`}
                  value="carpool"
                  labelNumberOfLines={2}
                />
              ) : null}
              <RadioButton.Item label="Custom address" value="custom" />
            </RadioButton.Group>
            {pickupMode === 'custom' && (
              <TextInput
                label="Pickup address"
                value={customPickup}
                onChangeText={setCustomPickup}
                multiline
                style={{ marginTop: 4 }}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRideDialog(false)} disabled={rideBusy}>
              Cancel
            </Button>
            <Button onPress={submitRide} loading={rideBusy}>
              {editingRideId ? 'Update' : 'Request'}
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
