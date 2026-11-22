import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
// `getReactNativePersistence` is only exported from the RN entry of
// `firebase/auth`. TS resolves the default declaration file which omits it,
// so we import it with a type-escape hatch — at runtime Metro picks the RN
// bundle where this symbol exists.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

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

/**
 * Local testing: with EXPO_PUBLIC_USE_EMULATORS=1 the app talks to the Auth,
 * Firestore and Functions emulators instead of the live project, under a
 * `demo-` project ID, which Firebase never connects to real resources. Nothing
 * you do reaches live data. See "Local emulators" in CLAUDE.md.
 */
// Dev builds only: if the variable were set by mistake when running
// `eas update` or a store build, every member's app would point at 127.0.0.1.
export const usingEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_EMULATORS === '1';
export const EMULATOR_PROJECT_ID = 'demo-tribe313';

const app = getApps().length
  ? getApp()
  : initializeApp(usingEmulators ? { ...cfg, projectId: EMULATOR_PROJECT_ID } : cfg);

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

// The iOS simulator reaches the Mac as 127.0.0.1, the Android emulator as
// 10.0.2.2; a real phone needs EXPO_PUBLIC_EMULATOR_HOST set to the Mac's IP.
if (usingEmulators) {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
  // Expo only inlines EXPO_PUBLIC_* variables written out in full, so no process.env[name].
  const authPort = Number(process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT) || 9099;
  const firestorePort = Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT) || 8181;
  const functionsPort = Number(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT) || 5001;
  try {
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, firestorePort);
    connectFunctionsEmulator(functions, host, functionsPort);
    console.warn(`[firebase] Using local emulators on ${host}. Nothing here reaches live data.`);
  } catch {
    // Already connected: a fast refresh re-ran this module.
  }
}
