import { View, type ViewStyle } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { palette } from '../theme';

export function DangerZone({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Card
      style={[
        {
          borderWidth: 1,
          borderColor: palette.danger,
          backgroundColor: 'rgba(215, 38, 61, 0.04)',
        },
        style,
      ]}
    >
      <Card.Content style={{ gap: 12 }}>
        <Text variant="titleMedium" style={{ color: palette.danger }}>
          Danger zone
        </Text>
        <View>{children}</View>
      </Card.Content>
    </Card>
  );
}
