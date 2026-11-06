import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import type { PickerSpec } from '../types';
import { B, TAP } from '../theme';
import { BottomSheet } from './BottomSheet';
import { WHEEL_HEIGHT, WheelBand, WheelColumn } from './WheelPicker';

/**
 * Bottom-sheet number picker. Opens on `value`, or `fallback` when empty.
 * Done returns the picked value (or null if it counts as empty, e.g. 0:00).
 */
export function PickerSheet({
  spec,
  visible,
  value,
  fallback,
  onDone,
  onClose,
  clearable = true,
}: {
  spec: PickerSpec | null;
  visible: boolean;
  value: number | null;
  fallback: number;
  onDone: (v: number | null) => void;
  onClose: () => void;
  clearable?: boolean;
}) {
  const [cols, setCols] = useState<number[]>([]);

  useEffect(() => {
    if (visible && spec) setCols(spec.fromValue(value ?? fallback));
  }, [visible, spec, value, fallback]);

  if (!spec) return null;

  const done = () => {
    const v = spec.toValue(cols);
    onDone(spec.isEmpty(v) ? null : v);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={spec.title}
      subtitle={spec.subtitle}
      scroll={false}
      footer={
        <View style={styles.buttons}>
          {clearable ? (
            <Button mode="outlined" style={styles.btn} contentStyle={styles.btnContent} onPress={() => onDone(null)}>
              Clear
            </Button>
          ) : null}
          <Button
            mode="contained"
            buttonColor={B.green}
            style={styles.btn}
            contentStyle={styles.btnContent}
            onPress={done}
          >
            Done
          </Button>
        </View>
      }
    >
      <View style={styles.wheels}>
        <WheelBand />
        {cols.length === spec.columns.length &&
          spec.columns.map((c, i) => (
            <WheelColumn
              key={`${spec.title}-${i}`}
              values={c.values}
              value={cols[i]}
              label={c.label}
              onChange={(v) => setCols((prev) => prev.map((p, j) => (j === i ? v : p)))}
            />
          ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wheels: { flexDirection: 'row', height: WHEEL_HEIGHT, marginVertical: 12, gap: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1 },
  btnContent: { minHeight: TAP },
});
