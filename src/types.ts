import type { Timestamp } from 'firebase/firestore';

export type UserStatus = 'pending' | 'approved' | 'evicted' | 'dismissed';

export type AppUser = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  addressGeo?: { lat: number; lng: number };
  carpoolAddress?: string;
  carpoolAddressGeo?: { lat: number; lng: number };
  shareLocation: boolean;
  emailVerified?: boolean;
  status: UserStatus;
  isAdmin: boolean;
  expoPushToken?: string;
  notificationsEnabled: boolean;
  badges: string[];
  attendedEventIds: string[];
  lastAttendedAt?: Timestamp | null;
  missedEventCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type EventDoc = {
  id: string;
  title: string;
  description: string;
  location: { label: string; address: string; lat: number; lng: number };
  startsAt: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
};

export type RsvpStatus = 'yes' | 'no' | 'maybe';

export type Rsvp = {
  uid: string;
  status: RsvpStatus;
  attended: boolean;
  updatedAt: Timestamp;
};

export type RideStatus = 'open' | 'matched' | 'cancelled';

export type Ride = {
  id: string;
  requesterUid: string;
  pickup: { label: string; address: string; lat: number; lng: number };
  status: RideStatus;
  driverUid?: string;
  createdAt: Timestamp;
  matchedAt?: Timestamp;
};
