import { useState } from 'react';
import { HelperText, Text } from 'react-native-paper';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/src/firebase/config';
import { AuthScreen } from '@/src/components/AuthScreen';
import { useAuth } from '@/src/contexts/AuthContext';
import { AppButton } from '@/src/components/AppButton';

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
        <AppButton variant="text" onPress={() => signOut(auth)} tone="onDark">
          Sign out
        </AppButton>
      }
    >
      <Text>
        We sent a verification link to <Text style={{ fontWeight: '600' }}>{auth.currentUser?.email}</Text>. Open
        the link, then tap below.
      </Text>
      {msg ? <HelperText type="info">{msg}</HelperText> : null}
      {err ? <HelperText type="error">{err}</HelperText> : null}
      <AppButton onPress={check} loading={busy === 'check'}>
        I&apos;ve verified
      </AppButton>
      <AppButton variant="secondary" onPress={resend} loading={busy === 'resend'}>
        Resend email
      </AppButton>
    </AuthScreen>
  );
}
