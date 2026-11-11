import { ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/contexts/AuthContext';
import { cardStyles } from '@/src/components/Cards';
import { CarpoolSection } from '@/src/components/admin/CarpoolSection';
import { ApprovalsSection } from '@/src/components/admin/ApprovalsSection';
import { RecurringSection } from '@/src/components/admin/RecurringSection';

/** Admin tools in one place: carpool pickup points, recurring events, then membership approvals. */
export default function Admin() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  if (!isAdmin) return <Redirect href="/" />;
  return (
    <ScrollView contentContainerStyle={[cardStyles.content, { paddingBottom: 40 + insets.bottom }]}>
      <CarpoolSection />
      <RecurringSection />
      <ApprovalsSection />
    </ScrollView>
  );
}
