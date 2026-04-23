import { FlatList, RefreshControl, View } from 'react-native';
import { ActivityIndicator, Button, Card, FAB, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useEvents } from '@/src/hooks/useEvents';
import { usePendingCount } from '@/src/hooks/usePendingCount';
import type { EventDoc } from '@/src/types';

function Section({ title, events }: { title: string; events: EventDoc[] }) {
  if (events.length === 0) return null;
  return (
    <View style={{ gap: 8, marginBottom: 16 }}>
      <Text variant="titleMedium" style={{ marginHorizontal: 16 }}>
        {title}
      </Text>
      {events.map((e) => (
        <Card
          key={e.id}
          style={{ marginHorizontal: 16 }}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })}
        >
          <Card.Title
            title={e.title}
            subtitle={`${format(e.startsAt.toDate(), 'PPp')} · ${e.location?.label ?? ''}`}
          />
        </Card>
      ))}
    </View>
  );
}

export default function Home() {
  const { loading, upcoming, past } = useEvents();
  const { isAdmin, appUser } = useAuth();
  const pendingCount = usePendingCount();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={[0]}
        keyExtractor={() => 'home'}
        renderItem={() => (
          <View style={{ paddingVertical: 16 }}>
            <Text variant="headlineSmall" style={{ marginHorizontal: 16, marginBottom: 12 }}>
              Welcome{appUser ? `, ${appUser.firstName}` : ''}
            </Text>
            {isAdmin && (
              <>
                <Button
                  mode="contained-tonal"
                  onPress={() => router.push('/admin/approvals')}
                  style={{ marginHorizontal: 16, marginBottom: 8 }}
                  icon={pendingCount > 0 ? 'circle-medium' : undefined}
                >
                  Admin · Pending approvals{pendingCount > 0 ? ` (${pendingCount})` : ''}
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => router.push('/admin/carpool-addresses')}
                  style={{ marginHorizontal: 16, marginBottom: 12 }}
                  icon="map-marker-multiple-outline"
                >
                  Admin · Carpool locations
                </Button>
              </>
            )}
            <Section title="Upcoming" events={upcoming} />
            {upcoming.length === 0 && (
              <Text style={{ marginHorizontal: 16, marginBottom: 16, opacity: 0.7 }}>
                No upcoming events.
              </Text>
            )}
            <Section title="Past" events={past} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
      />
      {isAdmin && (
        <FAB
          icon="plus"
          style={{ position: 'absolute', right: 16, bottom: 24 }}
          onPress={() => router.push('/event/new')}
        />
      )}
    </View>
  );
}
