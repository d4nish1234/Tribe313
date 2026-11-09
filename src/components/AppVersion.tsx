import { Text } from 'react-native-paper';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { format } from 'date-fns';

/**
 * What's actually running, read from the binary and the OTA update. Nothing to
 * bump by hand: the version and build number come from the store build (EAS
 * auto-increments the build number), and JS-only changes shipped with
 * `eas update` show up as the update's date and short id.
 */
export function AppVersion() {
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '?';
  const build = Constants.nativeBuildVersion;

  let update: string | null = null;
  if (__DEV__ || !Updates.isEnabled) {
    update = 'Development build';
  } else if (!Updates.isEmbeddedLaunch && Updates.updateId) {
    const when = Updates.createdAt ? format(Updates.createdAt, 'MMM d, yyyy') : '';
    update = `Update ${when} · ${Updates.updateId.slice(0, 7)}`.replace('  ', ' ');
  }

  return (
    <Text
      variant="bodySmall"
      style={{ textAlign: 'center', opacity: 0.6, marginTop: 16 }}
      selectable
    >
      Version {version}
      {build ? ` (${build})` : ''}
      {update ? `\n${update}` : ''}
    </Text>
  );
}
