import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { reload, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/src/firebase/config';

export default function Verify() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'resend' | 'check' | null>(null);

  async function resend() {
    setMsg(null);
    setErr(null);
    if (!auth.currentUser) return;
    setBusy('resend');
    try {
      await sendEmailVerification(auth.currentUser);
      setMsg('Verification email sent.');
    } catch (e: any) {
      setErr(e.message ?? 'Failed to send email');
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setMsg(null);
    setErr(null);
    if (!auth.currentUser) return;
    setBusy('check');
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        router.replace('/');
      } else {
        setErr('Email not verified yet. Check your inbox (and spam).');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text variant="headlineMedium">Verify your email</Text>
      <Text>
        We sent a verification link to{' '}
        <Text style={{ fontWeight: '600' }}>{auth.currentUser?.email}</Text>. Click the link, then tap
        below.
      </Text>
      {msg ? <HelperText type="info">{msg}</HelperText> : null}
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <Button mode="contained" onPress={check} loading={busy === 'check'}>
        I&apos;ve verified
      </Button>
      <Button mode="outlined" onPress={resend} loading={busy === 'resend'}>
        Resend email
      </Button>
      <View style={{ marginTop: 24 }}>
        <Button onPress={() => signOut(auth)}>Sign out</Button>
      </View>
    </ScrollView>
  );
}
