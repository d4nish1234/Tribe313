import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAuth, type Auth, type Persistence } from 'firebase/auth';
// `getReactNativePersistence` is only exported from the RN entry of
// `firebase/auth`. TS resolves the default declaration file which omits it,
// so we import it with a type-escape hatch — at runtime Metro picks the RN
// bundle where this symbol exists.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const cfg = (Constants.expoConfig?.extra?.firebase ?? {}) as Partial<FirebaseConfig>;

function assertConfig(c: Partial<FirebaseConfig>): asserts c is FirebaseConfig {
  const missing = (
    ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'] as const
  ).filter((k) => !c[k] || c[k] === 'REPLACE');
  if (missing.length) {
    throw new Error(
      `Firebase config missing/unfilled keys in app.json → extra.firebase: ${missing.join(', ')}`,
    );
  }
}

assertConfig(cfg);

const app = getApps().length ? getApp() : initializeApp(cfg);

let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  const { getAuth } = require('firebase/auth');
  _auth = getAuth(app);
}

export const auth: Auth = _auth;
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app);
export { app };
