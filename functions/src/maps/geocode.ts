import { HttpsError, onCall } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import { GOOGLE_MAPS_KEY } from '../lib/config';

export const geocodeAddress = onCall<{ address: string }>(
  { secrets: [GOOGLE_MAPS_KEY] },
  async (req) => {
    if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Login required');
    const address = (req.data?.address ?? '').trim();
    if (!address) throw new HttpsError('invalid-argument', 'address required');

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', GOOGLE_MAPS_KEY.value());

    const res = await fetch(url.toString());
    const body = (await res.json()) as {
      status: string;
      results?: {
        geometry?: { location?: { lat: number; lng: number } };
        formatted_address?: string;
      }[];
    };

    if (body.status !== 'OK' || !body.results?.length) {
      throw new HttpsError('not-found', `Geocoding failed: ${body.status}`);
    }
    const r = body.results[0];
    const loc = r.geometry?.location;
    if (!loc) throw new HttpsError('not-found', 'No location');
    return {
      lat: loc.lat,
      lng: loc.lng,
      formattedAddress: r.formatted_address ?? address,
    };
  },
);
