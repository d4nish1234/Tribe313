import { useState } from 'react';
import { View } from 'react-native';
import { HelperText, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { authErrorMessage } from '@/src/lib/authErrors';
import { AppButton } from '@/src/components/AppButton';

export default function Signup() {
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    if (!firstName.trim() || !lastName.trim()) {
      setErr('First and last name are required.');
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: `${firstName} ${lastName}`.trim() });
      // onUserCreate function will seed the user doc. As a safety net, also write a
      // minimal client-side doc so the profile has names even if the function is cold.
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          status: 'pending',
          isAdmin: false,
          shareLocation: false,
          notificationsEnabled: true,
          badges: [],
          attendedEventIds: [],
          missedEventCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await sendEmailVerification(cred.user);
      // No navigation here: the auth gate moves to /verify once the account exists.
    } catch (e) {
      setErr(authErrorMessage(e, 'Couldn’t create your account. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      title="Create account"
      subtitle="An admin approves every new member."
      footer={
        <AppButton variant="text" onPress={() => router.replace('/login')} tone="onDark">
          Already a member? Log in
        </AppButton>
      }
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextInput
          mode="outlined"
          label="First name"
          value={firstName}
          onChangeText={setFirst}
          autoComplete="given-name"
          textContentType="givenName"
          style={{ flex: 1 }}
        />
        <TextInput
          mode="outlined"
          label="Last name"
          value={lastName}
          onChangeText={setLast}
          autoComplete="family-name"
          textContentType="familyName"
          style={{ flex: 1 }}
        />
      </View>
      <TextInput
        mode="outlined"
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      <View>
        <TextInput
          mode="outlined"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword((s) => !s)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            />
          }
        />
        <HelperText type="info">At least 6 characters.</HelperText>
      </View>
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <AppButton onPress={submit} loading={busy} disabled={busy}>
        Sign up
      </AppButton>
    </AuthScreen>
  );
}
