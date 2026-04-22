import { ScrollView, View } from 'react-native';
import { Button, Card, Switch, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { auth, db } from '@/src/firebase/config';
import { palette } from '@/src/theme';

export default function Evicted() {
  const { firebaseUser, appUser } = useAuth();
  const enabled = !!appUser?.notificationsEnabled;

  async function toggle(v: boolean) {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid), { notificationsEnabled: v });
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
      <Card style={{ borderLeftWidth: 4, borderLeftColor: palette.danger }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall">You were evicted</Text>
          <Text>
            Chopping block was in effect and you were evicted. You can come back by joining a session.
          </Text>
        </Card.Content>
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text>Notify me about the next event</Text>
        <Switch value={enabled} onValueChange={toggle} />
      </View>
      <Button onPress={() => signOut(auth)}>Sign out</Button>
    </ScrollView>
  );
}
