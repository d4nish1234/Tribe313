import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/firebase/config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      setErr(e.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
        <Text variant="displaySmall" style={{ textAlign: 'center', marginBottom: 16 }}>
          Tribe313
        </Text>
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {err ? <HelperText type="error">{err}</HelperText> : null}
        <Button mode="contained" onPress={submit} loading={busy} disabled={busy}>
          Log in
        </Button>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Link href="/signup"><Text>Sign up</Text></Link>
          <Link href="/forgot"><Text>Forgot password</Text></Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
