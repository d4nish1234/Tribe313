import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { useEvents } from '@/src/hooks/useEvents';
import { BrandLogo } from '@/src/components/BrandLogo';
import { CardBox, SectionHeader, cardStyles } from '@/src/components/Cards';
import { EventRow } from '@/src/components/EventRow';
import { useAssignments, useBenchmarkSessions } from '@/src/benchmark/hooks';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { knownSessions } from '@/src/benchmark/engine/score';
import { buildWorkouts } from '@/src/benchmark/engine/workouts';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { WeekWorkouts } from '@/src/benchmark/components/WeekWorkouts';
import { CoachExtras } from '@/src/benchmark/components/CoachExtras';

export default function HomeTab() {
  return (
    <ExplainProvider>
      <Home />
    </ExplainProvider>
  );
}

function Home() {
  const { loading, upcoming } = useEvents();
  const { appUser, firebaseUser } = useAuth();
  const insets = useSafeAreaInsets();
  const explain = useExplain();

  // Same data and rules as the Training tab, so the two always agree.
  const { sessions } = useBenchmarkSessions(firebaseUser?.uid);
  const { assignments } = useAssignments(firebaseUser?.uid);
  const latest = useMemo(() => knownSessions(sessions)[0] ?? null, [sessions]);
  const v = latest ? getVersion(latest.version)! : latestVersion();
  const workouts = useMemo(() => buildWorkouts(v, latest), [v, latest]);

  const next = upcoming[0];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
        <BrandLogo />
        <View style={cardStyles.content}>
          <Text variant="headlineSmall">Welcome{appUser ? `, ${appUser.firstName}` : ''}</Text>

          {/* Only the next event; the rest are one tap away. */}
          <SectionHeader title="Up next" />
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} />
          ) : next ? (
            <CardBox>
              <EventRow event={next} first />
            </CardBox>
          ) : (
            <Text style={cardStyles.muted}>No upcoming events.</Text>
          )}

          <SectionHeader
            title="Your workouts this week"
            right={<InfoLink label="How?" onPress={() => explain(v.explainer('week'))} />}
          />
          <WeekWorkouts v={v} workouts={workouts} />
          {!latest ? (
            <Text style={cardStyles.muted}>
              Do your first benchmark and these will be built around your results.
            </Text>
          ) : null}

          <CoachExtras v={v} assignments={assignments} />
        </View>
      </ScrollView>
    </View>
  );
}
