import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/firebase/config';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg('If that email is registered, a reset link was sent.');
    } catch (e: any) {
      setErr(e.message ?? 'Failed to send reset email');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
        <Text variant="headlineMedium">Reset password</Text>
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {msg ? <HelperText type="info">{msg}</HelperText> : null}
        {err ? <HelperText type="error">{err}</HelperText> : null}
        <Button mode="contained" onPress={submit} loading={busy} disabled={busy}>
          Send reset email
        </Button>
        <Link href="/login"><Text>Back to log in</Text></Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
