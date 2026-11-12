import { View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useEvent } from '@/src/hooks/useEvents';
import { AppButton } from '@/src/components/AppButton';
import { cardStyles } from '@/src/components/Cards';
import { EventForm } from '@/src/components/EventForm';

/** Edit a one-off event. Opened from the event screen's admin section. */
export default function EditEvent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { event, loading } = useEvent(id);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Admins only.</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Text style={cardStyles.muted}>This event was deleted.</Text>
        <AppButton variant="text" onPress={() => router.back()}>
          Go back
        </AppButton>
      </View>
    );
  }
  // Keyed so the form starts from the event once, not on every live update.
  return <EventForm key={event.id} event={event} />;
}
