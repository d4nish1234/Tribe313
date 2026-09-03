import { httpsCallable } from 'firebase/functions';
import { functions } from './config';

export const call = <Req = unknown, Res = unknown>(name: string) =>
  httpsCallable<Req, Res>(functions, name);

export const approveUser = call<{ uid: string }, { ok: true }>('approveUser');
export const promoteAdmin = call<{ uid: string }, { ok: true }>('promoteAdmin');
export const demoteAdmin = call<{ uid: string }, { ok: true }>('demoteAdmin');
export const deactivateUser = call<{ uid: string }, { ok: true }>('deactivateUser');
export const reinstateUser = call<{ uid: string }, { ok: true }>('reinstateUser');
export const selfDeleteAccount = call<void, { ok: true }>('selfDeleteAccount');
export const geocodeAddress = call<
  { address: string },
  { lat: number; lng: number; formattedAddress: string }
>('geocodeAddress');
export const getDirections = call<
  {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: { lat: number; lng: number }[];
    optimize?: boolean;
  },
  { polyline: string; durationSec: number; distanceMeters: number; order?: number[] }
>('getDirections');
