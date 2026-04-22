import { SegmentedButtons } from 'react-native-paper';
import type { RsvpStatus } from '../types';

export function RsvpPicker({
  value,
  onChange,
  disabled,
}: {
  value: RsvpStatus | undefined;
  onChange: (v: RsvpStatus) => void;
  disabled?: boolean;
}) {
  return (
    <SegmentedButtons
      value={value ?? ''}
      onValueChange={(v) => onChange(v as RsvpStatus)}
      buttons={[
        { value: 'yes', label: 'Yes', disabled },
        { value: 'maybe', label: 'Maybe', disabled },
        { value: 'no', label: 'No', disabled },
      ]}
    />
  );
}
