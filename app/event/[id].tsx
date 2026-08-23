import { EventMap } from "@/src/components/EventMap";
import { RideCard } from "@/src/components/RideCard";
import { RsvpPicker } from "@/src/components/RsvpPicker";
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/firebase/config";
import { geocodeAddress } from "@/src/firebase/fn";
import { useCarpoolLocations } from "@/src/hooks/useCarpoolLocations";
import { useEvent } from "@/src/hooks/useEvents";
import { useMembers } from "@/src/hooks/useMembers";
import { useRides } from "@/src/hooks/useRides";
import { useRsvps } from "@/src/hooks/useRsvps";
import type { RsvpStatus } from "@/src/types";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
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
} from "react-native-paper";

// pickupMode is 'home', 'custom', or a carpoolLocation ID
function resolveMode(
  pickupAddress: string,
  home: string | undefined,
  carpoolLocations: { id: string; address: string }[],
): string {
  if (home && pickupAddress === home) return "home";
  const match = carpoolLocations.find((l) => l.address === pickupAddress);
  if (match) return match.id;
  return "custom";
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firebaseUser, appUser, isAdmin } = useAuth();
  const { event, loading } = useEvent(id);
  const { rsvps } = useRsvps(id);
  const { rides } = useRides(id);
  const { members } = useMembers();
  const { locations: carpoolLocations } = useCarpoolLocations();

  const [rideDialog, setRideDialog] = useState(false);
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [pickupMode, setPickupMode] = useState("home");
  const [customPickup, setCustomPickup] = useState("");
  const [rideBusy, setRideBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [pendingRsvpNo, setPendingRsvpNo] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const myRsvp = useMemo(
    () => rsvps.find((r) => r.uid === firebaseUser?.uid),
    [rsvps, firebaseUser?.uid],
  );
  const myActiveRide = useMemo(
    () =>
      rides.find(
        (r) => r.requesterUid === firebaseUser?.uid && r.status !== "cancelled",
      ),
    [rides, firebaseUser?.uid],
  );
  const iAmDriving = useMemo(
    () =>
      rides.some(
        (r) => r.driverUid === firebaseUser?.uid && r.status !== "cancelled",
      ),
    [rides, firebaseUser?.uid],
  );
  const myDrivingRides = useMemo(
    () =>
      rides.filter(
        (r) => r.driverUid === firebaseUser?.uid && r.status === "matched",
      ),
    [rides, firebaseUser?.uid],
  );
  const visibleRides = useMemo(
    () => rides.filter((r) => r.status !== "cancelled"),
    [rides],
  );

  const nameFor = (uid: string) => {
    const m = members.find((x) => x.uid === uid);
    return m ? `${m.firstName} ${m.lastName}` : "Member";
  };
  const firstNameFor = (uid: string) => {
    const m = members.find((x) => x.uid === uid);
    return m?.firstName ?? "Member";
  };

  const rideGroups = useMemo(() => {
    const unassigned = visibleRides.filter((r) => !r.driverUid);
    const byDriver = new Map<string, typeof visibleRides>();
    for (const r of visibleRides) {
      if (!r.driverUid) continue;
      const arr = byDriver.get(r.driverUid) ?? [];
      arr.push(r);
      byDriver.set(r.driverUid, arr);
    }
    const driverSections = Array.from(byDriver.entries()).map(
      ([uid, items]) => ({
        uid,
        title:
          uid === firebaseUser?.uid
            ? "My Rides"
            : `${firstNameFor(uid)}'s Rides`,
        rides: items,
        isMine: uid === firebaseUser?.uid,
      }),
    );
    driverSections.sort((a, b) => {
      if (a.isMine) return -1;
      if (b.isMine) return 1;
      return a.title.localeCompare(b.title);
    });
    return { unassigned, driverSections };
  }, [visibleRides, members, firebaseUser?.uid]);
  const memberPins = members
    .filter((m) => m.shareLocation && m.addressGeo)
    .map((m) => ({
      uid: m.uid,
      name: `${m.firstName} ${m.lastName}`,
      lat: m.addressGeo!.lat,
      lng: m.addressGeo!.lng,
    }));

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!event || !firebaseUser) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Event not found.</Text>
      </View>
    );
  }

  function openRideDialog(rideId?: string) {
    if (rideId) {
      const ride = rides.find((r) => r.id === rideId);
      const currentAddress = ride?.pickup?.address ?? "";
      const mode = resolveMode(
        currentAddress,
        appUser?.address ?? undefined,
        carpoolLocations,
      );
      setPickupMode(mode);
      setCustomPickup(mode === "custom" ? currentAddress : "");
      setEditingRideId(rideId);
    } else {
      setPickupMode(
        appUser?.address ? "home" : (carpoolLocations[0]?.id ?? "custom"),
      );
      setCustomPickup("");
      setEditingRideId(null);
    }
    setRideDialog(true);
  }

  function resolvedPickup(): {
    address: string;
    geo: { lat: number; lng: number } | null;
  } {
    if (pickupMode === "home") {
      return {
        address: appUser?.address ?? "",
        geo: appUser?.addressGeo ?? null,
      };
    }
    if (pickupMode === "custom") {
      return { address: customPickup.trim(), geo: null };
    }
    // carpool location ID
    const loc = carpoolLocations.find((l) => l.id === pickupMode);
    return loc
      ? { address: loc.address, geo: { lat: loc.lat, lng: loc.lng } }
      : { address: "", geo: null };
  }

  async function submitRide() {
    if (!firebaseUser || !event) return;
    const { address: src, geo: cachedGeo } = resolvedPickup();
    if (!src) {
      setSnack("Enter a pickup address or save one in Settings.");
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
      const pickup = {
        label: src,
        address: src,
        lat: geo?.lat ?? 0,
        lng: geo?.lng ?? 0,
      };

      try {
        if (editingRideId) {
          await updateDoc(doc(db, "events", event.id, "rides", editingRideId), {
            pickup,
          });
          setSnack("Pickup updated");
        } else {
          await addDoc(collection(db, "events", event.id, "rides"), {
            requesterUid: firebaseUser.uid,
            pickup,
            status: "open",
            createdAt: serverTimestamp(),
          });
          setSnack("Ride requested");
        }
        setRideDialog(false);
      } catch (e: any) {
        setSnack(e?.message ?? "Failed to submit ride request");
      }
    } finally {
      setRideBusy(false);
    }
  }

  async function writeRsvp(status: RsvpStatus) {
    if (!firebaseUser || !event) return;
    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (!myRsvp) payload.attended = false;
    await setDoc(
      doc(db, "events", event.id, "rsvps", firebaseUser.uid),
      payload,
      { merge: true },
    );
  }

  async function setRsvp(status: RsvpStatus) {
    if (!firebaseUser || !event) return;
    if (status === "no" && (myActiveRide || myDrivingRides.length > 0)) {
      setPendingRsvpNo(true);
      return;
    }
    try {
      await writeRsvp(status);
    } catch (e: any) {
      setSnack(e?.message ?? "Failed to update RSVP");
    }
  }

  async function confirmRsvpNoCancelRide() {
    if (!event) {
      setPendingRsvpNo(false);
      return;
    }
    try {
      if (myActiveRide) {
        await updateDoc(doc(db, "events", event.id, "rides", myActiveRide.id), {
          status: "cancelled",
        });
      }
      for (const r of myDrivingRides) {
        await updateDoc(doc(db, "events", event.id, "rides", r.id), {
          status: "open",
          driverUid: deleteField(),
          matchedAt: deleteField(),
        });
      }
      await writeRsvp("no");
    } catch (e: any) {
      setSnack(e?.message ?? "Failed to update RSVP");
    } finally {
      setPendingRsvpNo(false);
    }
  }

  async function offerRide(rideId: string) {
    if (!firebaseUser || !event) return;
    try {
      await updateDoc(doc(db, "events", event.id, "rides", rideId), {
        status: "matched",
        driverUid: firebaseUser.uid,
        matchedAt: serverTimestamp(),
      });
      setSnack("Ride offered");
    } catch (e: any) {
      setSnack(e?.message ?? "Failed to offer ride");
    }
  }

  async function cancelRide(rideId: string) {
    if (!event) return;
    try {
      await updateDoc(doc(db, "events", event.id, "rides", rideId), {
        status: "cancelled",
      });
    } catch (e: any) {
      setSnack(e?.message ?? "Failed to cancel ride");
    }
  }

  async function deleteEvent() {
    if (!event) return;
    await deleteDoc(doc(db, "events", event.id));
    router.back();
  }

  async function toggleAttended(uid: string, next: boolean) {
    if (!event) return;
    await setDoc(
      doc(db, "events", event.id, "rsvps", uid),
      { attended: next, updatedAt: serverTimestamp() },
      { merge: true },
    );
  }

  const yesCount = rsvps.filter((r) => r.status === "yes").length;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text variant="headlineSmall">{event.title}</Text>
        <Text style={{ opacity: 0.75 }}>
          {format(event.startsAt.toDate(), "PPPPp")}
        </Text>
        <Text style={{ opacity: 0.75 }}>{event.location?.label}</Text>
        {event.description ? (
          <Text style={{ marginTop: 8 }}>{event.description}</Text>
        ) : null}
      </View>

      {event.location?.lat ? (
        <EventMap
          event={event}
          rides={rides}
          memberPins={memberPins}
          carpoolPins={carpoolLocations.map((l) => ({
            id: l.id,
            label: l.label,
            lat: l.lat,
            lng: l.lng,
          }))}
          viewerUid={firebaseUser.uid}
        />
      ) : null}

      <Divider />

      <Text variant="titleMedium">Your RSVP</Text>
      <RsvpPicker value={myRsvp?.status} onChange={setRsvp} />
      <Text style={{ opacity: 0.7 }}>{yesCount} going</Text>

      <Divider />

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text variant="titleMedium">Rides</Text>
        {!myActiveRide && !iAmDriving && (
          <Button mode="contained-tonal" onPress={() => openRideDialog()}>
            I need a ride
          </Button>
        )}
      </View>

      {visibleRides.length === 0 ? (
        <Text style={{ opacity: 0.7 }}>No ride requests yet.</Text>
      ) : (
        <>
          {rideGroups.driverSections.map((section) => (
            <View key={section.uid} style={{ gap: 8 }}>
              <Text variant="titleSmall" style={{ marginTop: 4 }}>
                {section.title}
              </Text>
              {section.rides.map((r) => {
                const isOwner = r.requesterUid === firebaseUser.uid;
                return (
                  <RideCard
                    key={r.id}
                    ride={r}
                    requesterName={nameFor(r.requesterUid)}
                    driverName={r.driverUid ? nameFor(r.driverUid) : undefined}
                    canOffer={false}
                    isOwner={isOwner}
                    onEdit={isOwner ? () => openRideDialog(r.id) : undefined}
                    onCancel={
                      isOwner || isAdmin ? () => cancelRide(r.id) : undefined
                    }
                  />
                );
              })}
            </View>
          ))}
          {rideGroups.unassigned.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text variant="titleSmall" style={{ marginTop: 4 }}>
                Needs a ride
              </Text>
              {rideGroups.unassigned.map((r) => {
                const isOwner = r.requesterUid === firebaseUser.uid;
                const canOffer = !isOwner && !myActiveRide;
                return (
                  <RideCard
                    key={r.id}
                    ride={r}
                    requesterName={nameFor(r.requesterUid)}
                    driverName={undefined}
                    canOffer={canOffer}
                    isOwner={isOwner}
                    onOffer={canOffer ? () => offerRide(r.id) : undefined}
                    onEdit={isOwner ? () => openRideDialog(r.id) : undefined}
                    onCancel={
                      isOwner || isAdmin ? () => cancelRide(r.id) : undefined
                    }
                  />
                );
              })}
            </View>
          )}
        </>
      )}

      {isAdmin && (
        <>
          <Divider />
          <Text variant="titleMedium">Admin · Attendance</Text>
          {rsvps
            .filter((r) => r.status === "yes")
            .map((r) => (
              <Card key={r.uid} style={{ marginBottom: 8 }}>
                <Card.Title
                  title={nameFor(r.uid)}
                  right={() => (
                    <IconButton
                      icon={r.attended ? "check-circle" : "circle-outline"}
                      onPress={() => toggleAttended(r.uid, !r.attended)}
                    />
                  )}
                />
              </Card>
            ))}
          <Button
            mode="outlined"
            textColor="#D7263D"
            onPress={() => setDeleteConfirm(true)}
          >
            Delete event
          </Button>
        </>
      )}

      <Portal>
        <Dialog
          visible={pendingRsvpNo}
          onDismiss={() => setPendingRsvpNo(false)}
        >
          <Dialog.Title>
            {myDrivingRides.length > 0
              ? "Back out of driving?"
              : "Cancel your ride?"}
          </Dialog.Title>
          <Dialog.Content>
            <Text>
              {myDrivingRides.length > 0
                ? `You offered ${myDrivingRides.length === 1 ? "a ride" : `${myDrivingRides.length} rides`} for this event. If you RSVP no, you'll be unmatched and the rider${myDrivingRides.length === 1 ? "" : "s"} and admins will be notified.`
                : "You requested a ride for this event. If you RSVP no, your ride request will be cancelled."}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingRsvpNo(false)}>No</Button>
            <Button onPress={confirmRsvpNoCancelRide} textColor="#D7263D">
              Yes
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteConfirm}
          onDismiss={() => setDeleteConfirm(false)}
        >
          <Dialog.Title>Delete event?</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will permanently delete "{event.title}" and all its data.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirm(false)}>Cancel</Button>
            <Button onPress={deleteEvent} textColor="#D7263D">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={rideDialog} onDismiss={() => setRideDialog(false)}>
          <Dialog.Title>
            {editingRideId ? "Edit pickup" : "Request a ride"}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 4 }}>
            <RadioButton.Group value={pickupMode} onValueChange={setPickupMode}>
              {appUser?.address ? (
                <RadioButton.Item
                  label={`Home — ${appUser.address}`}
                  value="home"
                  labelNumberOfLines={2}
                />
              ) : null}
              {carpoolLocations.map((loc) => (
                <RadioButton.Item
                  key={loc.id}
                  label={`${loc.label} — ${loc.address}`}
                  value={loc.id}
                  labelNumberOfLines={2}
                />
              ))}
              <RadioButton.Item label="Custom address" value="custom" />
            </RadioButton.Group>
            {pickupMode === "custom" && (
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
              {editingRideId ? "Update" : "Request"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={2000}
      >
        {snack}
      </Snackbar>
    </ScrollView>
  );
}
