import AsyncStorage from '@react-native-async-storage/async-storage';
import { backendChanged, isDeadSession } from '../session';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('isDeadSession', () => {
  it('is true only for errors that mean the sign-in is gone', () => {
    expect(isDeadSession({ code: 'auth/invalid-refresh-token' })).toBe(true);
    expect(isDeadSession({ code: 'auth/user-not-found' })).toBe(true);
    expect(isDeadSession({ code: 'auth/network-request-failed' })).toBe(false);
    expect(isDeadSession(new Error('offline'))).toBe(false);
    expect(isDeadSession(null)).toBe(false);
  });
});

describe('backendChanged', () => {
  beforeEach(() => AsyncStorage.clear());

  it('is false on the first run and while the backend stays the same', async () => {
    expect(await backendChanged('live')).toBe(false);
    expect(await backendChanged('live')).toBe(false);
  });

  it('is true once when switching, then settles', async () => {
    await backendChanged('live');
    expect(await backendChanged('emulators')).toBe(true);
    expect(await backendChanged('emulators')).toBe(false);
    expect(await backendChanged('live')).toBe(true);
  });
});
