import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDirections } from '../firebase/fn';
import { decodePolyline } from '../lib/polyline';
import type { EventDoc, Ride } from '../types';

type Props = {
  event: EventDoc;
  rides: Ride[];
  memberPins?: { uid: string; name: string; lat: number; lng: number }[];
  carpoolPins?: { id: string; label: string; lat: number; lng: number }[];
  viewerUid: string | null;
};

type Role =
  | { kind: 'driver'; pickups: { lat: number; lng: number; name: string }[] }
  | { kind: 'requester'; pickup: { lat: number; lng: number; name: string } }
  | { kind: 'solo' };

function deriveRole(viewerUid: string | null, rides: Ride[]): Role {
  if (!viewerUid) return { kind: 'solo' };
  const asDriver = rides.filter((r) => r.driverUid === viewerUid && r.status === 'matched');
  if (asDriver.length) {
    return {
      kind: 'driver',
      pickups: asDriver.map((r) => ({
        lat: r.pickup.lat,
        lng: r.pickup.lng,
        name: r.pickup.label || r.pickup.address,
      })),
    };
  }
  const myReq = rides.find(
    (r) => r.requesterUid === viewerUid && r.status === 'matched',
  );
  if (myReq) {
    return {
      kind: 'requester',
      pickup: { lat: myReq.pickup.lat, lng: myReq.pickup.lng, name: myReq.pickup.label },
    };
  }
  return { kind: 'solo' };
}

export function EventMap({ event, rides, memberPins, carpoolPins, viewerUid }: Props) {
  const mapRef = useRef<MapView>(null);

  const openRequesterUids = useMemo(
    () => new Set(rides.filter((r) => r.status === 'open').map((r) => r.requesterUid)),
    [rides],
  );
  const visibleMemberPins = useMemo(
    () => (memberPins ?? []).filter((m) => openRequesterUids.has(m.uid)),
    [memberPins, openRequesterUids],
  );

  const allCoordinates = useMemo(() => {
    const coords: { latitude: number; longitude: number }[] = [
      { latitude: event.location.lat, longitude: event.location.lng },
    ];
    for (const c of carpoolPins ?? []) {
      coords.push({ latitude: c.lat, longitude: c.lng });
    }
    for (const m of visibleMemberPins) {
      coords.push({ latitude: m.lat, longitude: m.lng });
    }
    for (const r of rides) {
      if (r.status !== 'cancelled' && r.pickup?.lat) {
        coords.push({ latitude: r.pickup.lat, longitude: r.pickup.lng });
      }
    }
    return coords;
  }, [event.location.lat, event.location.lng, carpoolPins, visibleMemberPins, rides]);

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [poly, setPoly] = useState<{ lat: number; lng: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const role = useMemo(() => deriveRole(viewerUid, rides), [viewerUid, rides]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (!origin || !event) return;
    (async () => {
      setLoading(true);
      try {
        const dest = { lat: event.location.lat, lng: event.location.lng };
        const waypoints =
          role.kind === 'driver'
            ? role.pickups.map((p) => ({ lat: p.lat, lng: p.lng }))
            : role.kind === 'requester'
            ? [{ lat: role.pickup.lat, lng: role.pickup.lng }]
            : undefined;
        const res = await getDirections({
          origin,
          destination: dest,
          waypoints,
          optimize: role.kind === 'driver',
        });
        setPoly(decodePolyline(res.data.polyline));
      } catch {
        setPoly(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    origin?.lat,
    origin?.lng,
    event.id,
    role.kind,
    role.kind === 'driver'
      ? role.pickups.map((p) => `${p.lat},${p.lng}`).join('|')
      : role.kind === 'requester'
      ? `${role.pickup.lat},${role.pickup.lng}`
      : '',
  ]);

  function fitAll() {
    if (!mapRef.current || allCoordinates.length === 0) return;
    mapRef.current.fitToCoordinates(allCoordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: false,
    });
  }

  const region = {
    latitude: event.location.lat,
    longitude: event.location.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={{ height: 320, borderRadius: 8, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        onMapReady={fitAll}
      >
        <Marker
          coordinate={{ latitude: event.location.lat, longitude: event.location.lng }}
          title={event.title}
          description={event.location.label}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
        >
          <Text style={{ fontSize: 36 }}>🏁</Text>
        </Marker>
        {rides
          .filter((r) => r.status !== 'cancelled' && r.pickup?.lat)
          .map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.pickup.lat, longitude: r.pickup.lng }}
              title="Pickup"
              description={r.pickup.label || r.pickup.address}
              pinColor="orange"
              tracksViewChanges={false}
            />
          ))}
        {visibleMemberPins.map((m) => (
          <Marker
            key={m.uid}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.name}
            pinColor="red"
            tracksViewChanges={false}
          />
        ))}
        {(carpoolPins ?? []).map((c) => (
          <Marker
            key={`carpool-${c.id}`}
            coordinate={{ latitude: c.lat, longitude: c.lng }}
            title={c.label}
            description="Carpool location"
            pinColor="blue"
            tracksViewChanges={false}
          />
        ))}
        {poly && poly.length > 1 ? (
          <Polyline
            coordinates={poly.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeWidth={4}
          />
        ) : null}
      </MapView>
      {loading ? (
        <View style={{ position: 'absolute', top: 8, right: 8 }}>
          <ActivityIndicator />
        </View>
      ) : null}
    </View>
  );
}
