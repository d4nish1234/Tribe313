import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasOnboarded, markOnboarded, onboardedThisSession } from '../onboarding';

// Hoisted above the imports by jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('onboarding flag', () => {
  it('is per account and remembered once set', async () => {
    expect(await hasOnboarded('a')).toBe(false);
    await markOnboarded('a');
    expect(onboardedThisSession('a')).toBe(true);
    expect(await hasOnboarded('a')).toBe(true);
    expect(await hasOnboarded('b')).toBe(false);
  });

  it('reads a flag saved by an earlier launch', async () => {
    await AsyncStorage.setItem('onboarding:done:c', '2026-11-21');
    expect(onboardedThisSession('c')).toBe(false);
    expect(await hasOnboarded('c')).toBe(true);
  });

  it('lets the person in when storage can’t be read', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('nope'));
    expect(await hasOnboarded('d')).toBe(true);
  });
});
