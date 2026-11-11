import { useState } from 'react';
import { HelperText, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { authErrorMessage } from '@/src/lib/authErrors';
import { AppButton } from '@/src/components/AppButton';

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
        <AppButton variant="text" onPress={() => router.replace('/login')} tone="onDark">
          Back to log in
        </AppButton>
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
      <AppButton onPress={submit} loading={busy} disabled={busy}>
        Send reset email
      </AppButton>
    </AuthScreen>
  );
}
