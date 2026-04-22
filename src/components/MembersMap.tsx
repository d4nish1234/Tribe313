import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { AppUser } from '../types';

export function MembersMap({ members }: { members: AppUser[] }) {
  const pinned = members.filter((m) => m.shareLocation && m.addressGeo);
  if (!pinned.length) {
    return (
      <View style={{ height: 240, alignItems: 'center', justifyContent: 'center' }}>
        {/* empty */}
      </View>
    );
  }
  const first = pinned[0].addressGeo!;
  return (
    <View style={{ height: 320, borderRadius: 8, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: first.lat,
          longitude: first.lng,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
      >
        {pinned.map((m) => (
          <Marker
            key={m.uid}
            coordinate={{ latitude: m.addressGeo!.lat, longitude: m.addressGeo!.lng }}
            title={`${m.firstName} ${m.lastName}`}
            opacity={0.7}
          />
        ))}
      </MapView>
    </View>
  );
}
