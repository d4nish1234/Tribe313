import { StyleSheet, View } from 'react-native';
import { palette } from '../theme';

/** Line between list rows (members, approvals, locations…). Use as a FlatList
 *  `ItemSeparatorComponent`, or between items in a `.map()`. Inset from the
 *  left to line up with the row text; pass `inset={0}` for full width. */
export function RowDivider({ inset = 16 }: { inset?: number }) {
  return <View style={[styles.line, { marginLeft: inset }]} />;
}

/** Style for rows that draw their own top border (e.g. `i > 0 && rowDivider`). */
export const rowDivider = { borderTopWidth: 1, borderTopColor: palette.divider } as const;

const styles = StyleSheet.create({
  line: { height: 1, backgroundColor: palette.divider },
});
