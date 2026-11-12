import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '@/src/contexts/AuthContext';
import { EventForm } from '@/src/components/EventForm';

export default function NewEvent() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Admins only.</Text>
      </View>
    );
  }
  return <EventForm event={null} />;
}
