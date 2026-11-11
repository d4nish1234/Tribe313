import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityRole, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/src/theme';

/**
 * The card look shared by Home, Past events and Benchmark: flat white cards
 * with rounded corners, hairline dividers between rows, and small uppercase
 * section headings. Use these instead of Paper's Card so every list matches.
 */

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

export function CardBox({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * One row's share of a card, for virtualised lists (FlatList, SectionList)
 * where rows render one at a time and can't sit inside a single CardBox.
 * Consecutive slices look exactly like a CardBox: round the first and last.
 */
export function CardSlice({ first, last, children }: { first?: boolean; last?: boolean; children: ReactNode }) {
  return <View style={[styles.slice, first && styles.sliceTop, last && styles.sliceBottom]}>{children}</View>;
}

/**
 * One row in a CardBox: optional left slot, a title with an optional subtitle,
 * an optional right slot, and a chevron when it's tappable. Pass `first` to drop
 * the divider above it. `title` and `subtitle` take text or your own nodes.
 */
export function CardRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  first,
  dim,
  chevron = onPress ? 'forward' : null,
  accessibilityHint,
  accessibilityState,
  accessibilityRole = 'button',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  first?: boolean;
  /** Greys the text, e.g. evicted members. */
  dim?: boolean;
  chevron?: 'forward' | 'up' | 'down' | null;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityRole?: AccessibilityRole;
}) {
  const content = (
    <>
      {left}
      <View style={[{ flex: 1, gap: 2 }, dim && { opacity: 0.45 }]}>
        {typeof title === 'string' ? (
          <Text style={styles.rowTitle} numberOfLines={2}>
            {title}
          </Text>
        ) : (
          title
        )}
        {typeof subtitle === 'string' ? (
          <Text style={styles.muted} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          subtitle ?? null
        )}
      </View>
      {right}
      {chevron ? (
        <Ionicons
          name={chevron === 'forward' ? 'chevron-forward' : chevron === 'up' ? 'chevron-up' : 'chevron-down'}
          size={chevron === 'forward' ? 18 : 20}
          color={palette.muted}
        />
      ) : null}
    </>
  );

  // A row with no onPress is a plain View, so VoiceOver can reach the buttons
  // inside it (Approve, Offer ride, ⋮ menus). A tappable row is one element to
  // VoiceOver, so don't put other buttons in a row that has onPress.
  if (!onPress) return <View style={[styles.row, !first && styles.rowBorder]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowBorder, pressed && styles.pressed]}
      accessibilityRole={accessibilityRole}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
    >
      {content}
    </Pressable>
  );
}

/**
 * A card that opens in place: a CardRow header with an up/down chevron, and
 * the body under a divider. Used for workouts, tests and progress.
 */
export function ExpandableCard({
  title,
  subtitle,
  right,
  open,
  onToggle,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <CardBox>
      <CardRow
        first
        title={title}
        subtitle={subtitle}
        right={right}
        onPress={onToggle}
        chevron={open ? 'up' : 'down'}
        accessibilityState={{ expanded: open }}
      />
      {open ? <View style={styles.body}>{children}</View> : null}
    </CardBox>
  );
}

/** The title text style rows use, for callers that build a custom title node. */
export const rowTitleStyle = { fontSize: 16, fontWeight: '600', color: palette.text } as const;

/** Divider above a row, for lists that lay out their own rows (tables, forms). */
export const rowDivider = { borderTopWidth: 1, borderTopColor: palette.divider } as const;

export const cardStyles = StyleSheet.create({
  /** Screen content: same padding, spacing and max width everywhere. */
  content: { padding: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  muted: { color: palette.muted, fontSize: 13 },
});

const styles = StyleSheet.create({
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  card: { backgroundColor: palette.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  slice: { backgroundColor: palette.surface, paddingHorizontal: 12 },
  sliceTop: { borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: 4 },
  sliceBottom: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  rowBorder: rowDivider, // darker than `border` so rows read apart
  pressed: { opacity: 0.6 },
  rowTitle: rowTitleStyle,
  body: { paddingBottom: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  muted: cardStyles.muted,
});
