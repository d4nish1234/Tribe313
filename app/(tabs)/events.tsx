import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useEvents } from '@/src/hooks/useEvents';
import { useAuth } from '@/src/contexts/AuthContext';
import { AppFab } from '@/src/components/AppButton';
import { CardBox, SectionHeader, cardStyles } from '@/src/components/Cards';
import { EventRow } from '@/src/components/EventRow';
import type { EventDoc } from '@/src/types';

/** Every event: upcoming (soonest first), then past (most recent first). */
export default function EventsTab() {
  const { loading, upcoming, past } = useEvents();
  const { isAdmin } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Room at the bottom so the + button never covers the last event. */}
      <ScrollView contentContainerStyle={[cardStyles.content, { paddingBottom: isAdmin ? 96 : 40 }]}>
        <Group title="Upcoming" events={upcoming} empty="No upcoming events." />
        <Group title="Past" events={past} empty="No past events yet." />
      </ScrollView>
      {isAdmin && <AppFab icon="plus" accessibilityLabel="New event" onPress={() => router.push('/event/new')} />}
    </View>
  );
}

function Group({ title, events, empty }: { title: string; events: EventDoc[]; empty: string }) {
  return (
    <>
      <SectionHeader title={`${title}${events.length ? ` · ${events.length}` : ''}`} />
      {events.length ? (
        <CardBox>
          {events.map((e, i) => (
            <EventRow key={e.id} event={e} first={i === 0} />
          ))}
        </CardBox>
      ) : (
        <Text style={cardStyles.muted}>{empty}</Text>
      )}
    </>
  );
}
