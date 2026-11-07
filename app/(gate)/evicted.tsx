import { View } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/src/contexts/AuthContext';
import { auth, db } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';

export default function Evicted() {
  const { firebaseUser, appUser } = useAuth();
  const enabled = !!appUser?.notificationsEnabled;

  async function toggle(v: boolean) {
    if (!firebaseUser) return;
    await updateDoc(doc(db, 'users', firebaseUser.uid), { notificationsEnabled: v });
  }

  return (
    <AuthScreen
      title="You were evicted"
      footer={
        <Button onPress={() => signOut(auth)} textColor="#FFFFFF">
          Sign out
        </Button>
      }
    >
      <Text>Chopping block was in effect and you were evicted. You can come back by joining a session.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ flex: 1 }}>Notify me about the next event</Text>
        <Switch value={enabled} onValueChange={toggle} />
      </View>
    </AuthScreen>
  );
}
