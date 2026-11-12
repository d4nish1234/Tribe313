import { useState } from 'react';
import { Alert } from 'react-native';
import { IconButton, Menu } from 'react-native-paper';
import { CardRow } from '@/src/components/Cards';
import type { Ride } from '../types';
import { AppButton } from '@/src/components/AppButton';

/**
 * One ride request, as a row in a CardBox on the event screen. The section it
 * sits in says its state ("Needs a ride", or "<driver>'s Rides"), so the row
 * is just who and where from, plus the one thing you can do with it: Offer
 * (someone else's open request) or the ⋮ menu: Edit pickup / Cancel ride on
 * your own request, Stop driving on one you drive (it goes back to "Needs a
 * ride" for someone else), and Remove request for admins (asks first: it
 * takes the request away for everyone).
 */
export function RideCard({
  ride,
  requesterName,
  canOffer,
  isOwner,
  onOffer,
  onEdit,
  onCancel,
  onStopDriving,
  first,
}: {
  ride: Ride;
  requesterName: string;
  canOffer: boolean;
  isOwner: boolean;
  onOffer?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  /** You're this ride's driver: give it back so someone else can take it. */
  onStopDriving?: () => void;
  /** First row in its card: no divider above. */
  first?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pickup = ride.pickup?.label || ride.pickup?.address;
  const showOffer = !isOwner && ride.status === 'open' && canOffer && !!onOffer;
  const showMenu = ride.status !== 'cancelled' && !showOffer && (!!onEdit || !!onCancel || !!onStopDriving);

  const cancel = () => {
    if (isOwner) return onCancel?.();
    // An admin removing someone else's request: it's gone for everyone, so
    // check, and point drivers who only meant to back out at Stop driving.
    Alert.alert(
      `Remove ${requesterName}'s request?`,
      onStopDriving
        ? 'Nobody will see it any more. To stop driving them but leave the request for someone else, use Stop driving.'
        : 'Nobody will see it any more, and they would have to ask again.',
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onCancel?.() },
      ],
    );
  };

  const menu = showMenu ? (
    <Menu
      visible={menuOpen}
      onDismiss={() => setMenuOpen(false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          accessibilityLabel={`Ride options for ${isOwner ? 'your ride' : requesterName}`}
          onPress={() => setMenuOpen(true)}
          style={{ margin: 0 }}
        />
      }
    >
      {onEdit ? (
        <Menu.Item
          leadingIcon="pencil-outline"
          title="Edit pickup"
          onPress={() => {
            setMenuOpen(false);
            onEdit();
          }}
        />
      ) : null}
      {onStopDriving ? (
        <Menu.Item
          leadingIcon="car-off"
          title="Stop driving"
          onPress={() => {
            setMenuOpen(false);
            onStopDriving();
          }}
        />
      ) : null}
      {onCancel ? (
        <Menu.Item
          leadingIcon="close-circle-outline"
          title={isOwner ? 'Cancel ride' : 'Remove request'}
          onPress={() => {
            setMenuOpen(false);
            cancel();
          }}
        />
      ) : null}
    </Menu>
  ) : null;

  return (
    <CardRow
      first={first}
      title={isOwner ? 'You' : requesterName}
      subtitle={pickup ? `Pickup: ${pickup}` : undefined}
      right={
        showOffer ? (
          <AppButton
            variant="secondary"
            onPress={onOffer}
            accessibilityLabel={`Offer ${requesterName} a ride`}
            style={{ marginLeft: 8 }}
            contentStyle={{ minHeight: 40 }}
            labelStyle={{ fontSize: 15, marginHorizontal: 14 }}
          >
            Offer ride
          </AppButton>
        ) : (
          menu
        )
      }
    />
  );
}
