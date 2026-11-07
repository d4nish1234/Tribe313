import { useState } from 'react';
import { Button, HelperText, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { authErrorMessage } from '@/src/lib/authErrors';

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
    } catch (e) {
      setErr(authErrorMessage(e, 'Couldn’t send the reset email. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Reset password"
      subtitle="We’ll email you a link to set a new one."
      footer={
        <Button onPress={() => router.replace('/login')} textColor="#FFFFFF">
          Back to log in
        </Button>
      }
    >
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={submit}
      />
      {msg ? <HelperText type="info">{msg}</HelperText> : null}
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <Button mode="contained" onPress={submit} loading={busy} disabled={busy} contentStyle={{ minHeight: 48 }}>
        Send reset email
      </Button>
    </AuthScreen>
  );
}
