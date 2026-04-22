import { View } from 'react-native';
import { Chip } from 'react-native-paper';

const LABELS: Record<string, string> = {
  'first-event': 'First Event',
  'five-events': '5 Events',
  'ten-events': '10 Events',
  'twenty-five-events': '25 Events',
  'fifty-events': '50 Events',
  'hundred-events': '100 Events',
  'two-hundred-events': '200 Events',
  'streak-3': '3-Event Streak',
  'early-bird': 'Early Bird',
};

export function BadgeList({ badges, compact = false }: { badges: string[]; compact?: boolean }) {
  if (!badges?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {badges.map((b) => (
        <Chip key={b} compact={compact} style={{ marginRight: 4, marginBottom: 4 }}>
          {LABELS[b] ?? b}
        </Chip>
      ))}
    </View>
  );
}
