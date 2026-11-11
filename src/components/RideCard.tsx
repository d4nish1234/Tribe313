import { useState } from 'react';
import { View } from 'react-native';
import { Chip, IconButton, Menu, Text } from 'react-native-paper';
import { CardRow, cardStyles } from '@/src/components/Cards';
import type { Ride } from '../types';
import { AppButton } from '@/src/components/AppButton';

/** One ride request, as a row in a CardBox on the event screen. */
export function RideCard({
  ride,
  requesterName,
  driverName,
  canOffer,
  isOwner,
  onOffer,
  onEdit,
  onCancel,
  first,
}: {
  ride: Ride;
  requesterName: string;
  driverName?: string;
  canOffer: boolean;
  isOwner: boolean;
  onOffer?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  /** First row in its card: no divider above. */
  first?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const menu =
    isOwner && ride.status !== 'cancelled' ? (
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <IconButton icon="dots-vertical" accessibilityLabel="Ride options" onPress={() => setMenuOpen(true)} />
        }
      >
        <Menu.Item
          leadingIcon="pencil-outline"
          title="Edit pickup"
          onPress={() => {
            setMenuOpen(false);
            onEdit?.();
          }}
        />
        <Menu.Item
          leadingIcon="close-circle-outline"
          title="Cancel ride"
          onPress={() => {
            setMenuOpen(false);
            onCancel?.();
          }}
        />
      </Menu>
    ) : null;

  return (
    <CardRow
      first={first}
      title={`${requesterName} needs a ride`}
      subtitle={
        <>
          <Text style={cardStyles.muted}>Pickup: {ride.pickup?.label || ride.pickup?.address}</Text>
          {ride.status === 'matched' && driverName ? (
            <Text style={cardStyles.muted}>Driver: {driverName}</Text>
          ) : null}
          {!isOwner && ride.status === 'open' && canOffer && onOffer ? (
            <AppButton onPress={onOffer} style={{ marginTop: 8 }}>
              Offer ride
            </AppButton>
          ) : null}
        </>
      }
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Chip compact>{ride.status}</Chip>
          {menu}
        </View>
      }
    />
  );
}
