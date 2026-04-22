import { View } from 'react-native';
import { Button, Card, Chip, Text } from 'react-native-paper';
import type { Ride } from '../types';

export function RideCard({
  ride,
  requesterName,
  driverName,
  canOffer,
  canCancel,
  onOffer,
  onCancel,
}: {
  ride: Ride;
  requesterName: string;
  driverName?: string;
  canOffer: boolean;
  canCancel: boolean;
  onOffer?: () => void;
  onCancel?: () => void;
}) {
  return (
    <Card style={{ marginBottom: 8 }}>
      <Card.Content style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="titleSmall">{requesterName} needs a ride</Text>
          <Chip compact>{ride.status}</Chip>
        </View>
        <Text style={{ opacity: 0.75 }}>Pickup: {ride.pickup?.label || ride.pickup?.address}</Text>
        {ride.status === 'matched' && driverName ? (
          <Text style={{ opacity: 0.75 }}>Driver: {driverName}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {ride.status === 'open' && canOffer && onOffer ? (
            <Button mode="contained" onPress={onOffer}>
              Offer ride
            </Button>
          ) : null}
          {canCancel && onCancel && ride.status !== 'cancelled' ? (
            <Button onPress={onCancel}>Cancel</Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}
