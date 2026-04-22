import { HttpsError, onCall } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import { GOOGLE_MAPS_KEY } from '../lib/config';

type LatLng = { lat: number; lng: number };

type Req = {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  optimize?: boolean;
};

const encode = (p: LatLng) => `${p.lat},${p.lng}`;

export const getDirections = onCall<Req>(
  { secrets: [GOOGLE_MAPS_KEY] },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Login required');
    const { origin, destination, waypoints, optimize } = req.data ?? ({} as Req);
    if (!origin || !destination) throw new HttpsError('invalid-argument', 'origin & destination required');

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', encode(origin));
    url.searchParams.set('destination', encode(destination));
    if (waypoints?.length) {
      const wp = (optimize ? 'optimize:true|' : '') + waypoints.map(encode).join('|');
      url.searchParams.set('waypoints', wp);
    }
    url.searchParams.set('key', GOOGLE_MAPS_KEY.value());

    const res = await fetch(url.toString());
    const body = (await res.json()) as {
      status: string;
      routes?: {
        overview_polyline?: { points: string };
        waypoint_order?: number[];
        legs?: { duration?: { value: number }; distance?: { value: number } }[];
      }[];
    };

    if (body.status !== 'OK' || !body.routes?.length) {
      throw new HttpsError('not-found', `Directions failed: ${body.status}`);
    }
    const route = body.routes[0];
    const polyline = route.overview_polyline?.points ?? '';
    const durationSec = (route.legs ?? []).reduce((a, l) => a + (l.duration?.value ?? 0), 0);
    const distanceMeters = (route.legs ?? []).reduce((a, l) => a + (l.distance?.value ?? 0), 0);
    return {
      polyline,
      durationSec,
      distanceMeters,
      order: route.waypoint_order,
    };
  },
);
