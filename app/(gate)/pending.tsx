import { ScrollView } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '@/src/firebase/config';

export default function Pending() {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall">Pending review</Text>
          <Text>
            Your account is awaiting admin approval. You&apos;ll be notified when you&apos;re let in.
          </Text>
        </Card.Content>
      </Card>
      <Button onPress={() => signOut(auth)}>Sign out</Button>
    </ScrollView>
  );
}
