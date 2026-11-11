import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Button, FAB } from 'react-native-paper';
import { palette } from '@/src/theme';

type PaperButtonProps = ComponentProps<typeof Button>;

/**
 * The one button for the whole app, so every screen looks the same.
 *
 * - `primary`: the main action on a screen (Log in, Save, Approve). Solid green.
 * - `secondary`: other actions and navigation (Resend email, Dismiss, admin
 *   links). Green outline.
 * - `text`: dialog actions and low-key links (Cancel, Sign out, Forgot password?).
 *
 * `tone="danger"` turns any of them red (Delete, Remove). `tone="onDark"` is for
 * text buttons on the dark green sign-in background.
 *
 * Full-size buttons (`primary`, `secondary`) are 48pt tall with 16pt labels
 * and the same corner radius; `text` buttons are 44pt, the minimum tap target,
 * so dialog rows stay compact.
 */
export function AppButton({
  variant = 'primary',
  tone = 'default',
  style,
  contentStyle,
  labelStyle,
  ...rest
}: Omit<PaperButtonProps, 'mode' | 'buttonColor' | 'textColor'> & {
  variant?: 'primary' | 'secondary' | 'text';
  tone?: 'default' | 'danger' | 'onDark';
}) {
  const danger = tone === 'danger';
  const accent = danger ? palette.danger : palette.primary;
  const full = variant !== 'text';

  const mode: PaperButtonProps['mode'] =
    variant === 'primary' ? 'contained' : variant === 'secondary' ? 'outlined' : 'text';
  const textColor =
    variant === 'primary' ? '#FFFFFF' : tone === 'onDark' ? '#FFFFFF' : accent;

  return (
    <Button
      {...rest}
      mode={mode}
      buttonColor={variant === 'primary' ? accent : undefined}
      textColor={textColor}
      style={[
        full && styles.full,
        variant === 'secondary' && !rest.disabled && { borderColor: accent },
        style,
      ]}
      contentStyle={[full ? styles.fullContent : styles.textContent, contentStyle]}
      labelStyle={[full && styles.fullLabel, labelStyle]}
    />
  );
}

/** The floating "+" button: solid green with a white icon on every screen. */
export function AppFab(props: ComponentProps<typeof FAB>) {
  return <FAB {...props} color="#FFFFFF" style={[styles.fab, props.style]} />;
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: palette.primary },
  full: { borderRadius: 12 },
  fullContent: { minHeight: 48 },
  textContent: { minHeight: 44 },
  fullLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
});
