import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PickerSpec } from '../types';
import { BottomSheet } from './BottomSheet';
import { WHEEL_HEIGHT, WheelBand, WheelColumn } from './WheelPicker';
import { AppButton } from '@/src/components/AppButton';

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

  // The caller clears `spec` the moment the sheet closes. Keep showing the last
  // one so the sheet stays mounted and closes via visible=false. Unmounting a
  // visible native Modal on iOS can leave an invisible layer that blocks taps.
  const lastSpec = useRef(spec);
  if (spec) lastSpec.current = spec;
  const current = spec ?? lastSpec.current;

  useEffect(() => {
    if (visible && spec) setCols(spec.fromValue(value ?? fallback));
  }, [visible, spec, value, fallback]);

  if (!current) return null;
  const spec_ = current;

  const done = () => {
    const v = spec_.toValue(cols);
    onDone(spec_.isEmpty(v) ? null : v);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={spec_.title}
      subtitle={spec_.subtitle}
      scroll={false}
      footer={
        <View style={styles.buttons}>
          {clearable ? (
            <AppButton variant="secondary" style={styles.btn} onPress={() => onDone(null)}>
              Clear
            </AppButton>
          ) : null}
          <AppButton
            style={styles.btn}
           
            onPress={done}
          >
            Done
          </AppButton>
        </View>
      }
    >
      <View style={styles.wheels}>
        <WheelBand />
        {cols.length === spec_.columns.length &&
          spec_.columns.map((c, i) => (
            <WheelColumn
              key={`${spec_.title}-${i}`}
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
});
