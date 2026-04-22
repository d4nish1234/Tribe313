import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { Link, router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';

export default function Signup() {
  const [firstName, setFirst] = useState('');
  const [lastName, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      router.replace('/verify');
    } catch (e: any) {
      setErr(e.message ?? 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
        <Text variant="headlineMedium">Create account</Text>
        <TextInput label="First name" value={firstName} onChangeText={setFirst} />
        <TextInput label="Last name" value={lastName} onChangeText={setLast} />
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {err ? <HelperText type="error">{err}</HelperText> : null}
        <Button mode="contained" onPress={submit} loading={busy} disabled={busy}>
          Sign up
        </Button>
        <Link href="/login"><Text>Back to log in</Text></Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
