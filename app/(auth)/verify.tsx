import { useState } from 'react';
import { Button, HelperText, Text } from 'react-native-paper';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { useAuth } from '@/src/contexts/AuthContext';

export default function Verify() {
  const { reloadUser } = useAuth();
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
      await reloadUser();
      if (auth.currentUser.emailVerified) {
        // No navigation here: the auth gate sees emailVerified and moves on.
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { emailVerified: true });
      } else {
        setErr('Email not verified yet. Check your inbox (and spam).');
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Couldn’t check. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <AuthScreen
      title="Verify your email"
      footer={
        <Button onPress={() => signOut(auth)} textColor="#FFFFFF">
          Sign out
        </Button>
      }
    >
      <Text>
        We sent a verification link to <Text style={{ fontWeight: '600' }}>{auth.currentUser?.email}</Text>. Open
        the link, then tap below.
      </Text>
      {msg ? <HelperText type="info">{msg}</HelperText> : null}
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <Button mode="contained" onPress={check} loading={busy === 'check'} contentStyle={{ minHeight: 48 }}>
        I&apos;ve verified
      </Button>
      <Button mode="outlined" onPress={resend} loading={busy === 'resend'}>
        Resend email
      </Button>
    </AuthScreen>
  );
}
