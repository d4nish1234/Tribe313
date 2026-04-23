import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Chip, IconButton, Menu, Text } from 'react-native-paper';
import type { Ride } from '../types';

export function RideCard({
  ride,
  requesterName,
  driverName,
  canOffer,
  isOwner,
  onOffer,
  onEdit,
  onCancel,
}: {
  ride: Ride;
  requesterName: string;
  driverName?: string;
  canOffer: boolean;
  isOwner: boolean;
  onOffer?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card style={{ marginBottom: 8 }}>
      <Card.Content style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="titleSmall">{requesterName} needs a ride</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Chip compact>{ride.status}</Chip>
            {isOwner && ride.status !== 'cancelled' && (
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={18}
                    onPress={() => setMenuOpen(true)}
                  />
                }
              >
                <Menu.Item
                  leadingIcon="pencil-outline"
                  title="Edit pickup"
                  onPress={() => { setMenuOpen(false); onEdit?.(); }}
                />
                <Menu.Item
                  leadingIcon="close-circle-outline"
                  title="Cancel ride"
                  onPress={() => { setMenuOpen(false); onCancel?.(); }}
                />
              </Menu>
            )}
          </View>
        </View>

        <Text style={{ opacity: 0.75 }}>Pickup: {ride.pickup?.label || ride.pickup?.address}</Text>
        {ride.status === 'matched' && driverName ? (
          <Text style={{ opacity: 0.75 }}>Driver: {driverName}</Text>
        ) : null}

        {!isOwner && ride.status === 'open' && canOffer && onOffer ? (
          <View style={{ marginTop: 4 }}>
            <Button mode="contained" onPress={onOffer}>Offer ride</Button>
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}
