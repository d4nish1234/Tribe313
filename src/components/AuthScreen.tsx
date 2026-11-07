import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandLogo } from './BrandLogo';
import { palette } from '../theme';

/**
 * Shared layout for the signed-out and waiting screens (log in, sign up,
 * reset, verify, pending, evicted): the 313 TRIBE wordmark on green, with the
 * content on a white card underneath.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  refreshing,
  onRefresh,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
            ) : undefined
          }
        >
          <BrandLogo size="large" style={styles.logo} />
          <View style={styles.card}>
            <Text variant="headlineSmall" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  logo: { paddingVertical: 0, marginBottom: 32 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  title: { fontWeight: '700', color: palette.text },
  subtitle: { color: palette.muted, marginTop: 4 },
  body: { marginTop: 16, gap: 12 },
  footer: { marginTop: 16, alignItems: 'center', gap: 4 },
});
