import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// firebase-admin 13+ dropped the namespaced API (admin.apps, admin.firestore()).
if (!getApps().length) initializeApp();

export const db = getFirestore();
export const authAdmin = getAuth();
