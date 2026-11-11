import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { authErrorMessage } from '@/src/lib/authErrors';
import { AppButton } from '@/src/components/AppButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setErr(authErrorMessage(e, 'Couldn’t log in. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Log in to your account."
      footer={
        <AppButton variant="text" onPress={() => router.push('/signup')} tone="onDark">
          New here? Create an account
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
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextInput
        ref={passwordRef}
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        right={
          <TextInput.Icon
            icon={showPassword ? 'eye-off' : 'eye'}
            onPress={() => setShowPassword((s) => !s)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          />
        }
      />
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <AppButton onPress={submit} loading={busy} disabled={busy}>
        Log in
      </AppButton>
      <View style={{ alignItems: 'center' }}>
        <AppButton variant="text" compact onPress={() => router.push('/forgot')}>
          Forgot password?
        </AppButton>
      </View>
    </AuthScreen>
  );
}
