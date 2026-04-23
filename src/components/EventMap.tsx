import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDirections } from '../firebase/fn';
import { decodePolyline } from '../lib/polyline';
import type { EventDoc, Ride } from '../types';

type Props = {
  event: EventDoc;
  rides: Ride[];
  memberPins?: { uid: string; name: string; lat: number; lng: number }[];
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

export function EventMap({ event, rides, memberPins, viewerUid }: Props) {
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
  }, [origin?.lat, origin?.lng, event.id, role.kind]);

  const region = {
    latitude: event.location.lat,
    longitude: event.location.lng,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={{ height: 320, borderRadius: 8, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        <Marker
          coordinate={{ latitude: event.location.lat, longitude: event.location.lng }}
          title={event.title}
          description={event.location.label}
          pinColor="red"
        />
        {rides
          .filter((r) => r.status !== 'cancelled' && r.pickup?.lat)
          .map((r) => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.pickup.lat, longitude: r.pickup.lng }}
              title="Pickup"
              description={r.pickup.label || r.pickup.address}
              pinColor="orange"
            />
          ))}
        {(memberPins ?? []).map((m) => (
          <Marker
            key={m.uid}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.name}
            opacity={0.5}
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
