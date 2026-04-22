import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushRegistration() {
  const { firebaseUser, appUser } = useAuth();

  useEffect(() => {
    if (!firebaseUser || !appUser) return;
    if (!appUser.notificationsEnabled) return;
    if (!Device.isDevice) return;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants.easConfig as any)?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        )).data;

        if (token && token !== appUser.expoPushToken) {
          await updateDoc(doc(db, 'users', firebaseUser.uid), { expoPushToken: token });
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, [firebaseUser?.uid, appUser?.notificationsEnabled]);
}
