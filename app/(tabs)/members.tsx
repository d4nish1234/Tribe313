import { useMemo, useState, type ReactNode } from 'react';
import { Alert, SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Dialog, Icon, IconButton, Menu, Portal, Searchbar, SegmentedButtons, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { deactivateUser, demoteAdmin, promoteAdmin, reinstateUser } from '@/src/firebase/fn';
import { BadgeList } from '@/src/components/BadgeList';
import { palette } from '@/src/theme';
import { CardRow, CardSlice, SectionHeader, cardStyles } from '@/src/components/Cards';
import type { AppUser } from '@/src/types';
import { groupMembers, type MemberSort } from '@/src/lib/members';
import { AppButton } from '@/src/components/AppButton';

export default function Members() {
  const { isAdmin, firebaseUser } = useAuth();
  const { loading, members } = useMembers(true);
  const [sort, setSort] = useState<MemberSort>('name');
  const [confirm, setConfirm] = useState<AppUser | null>(null);
  const [reinstate, setReinstate] = useState<AppUser | null>(null);
  const [adminAction, setAdminAction] = useState<{ user: AppUser; type: 'promote' | 'demote' } | null>(null);
  const [menuUid, setMenuUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupMembers(members, { query, sort, isAdmin }), [members, query, sort, isAdmin]);

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    try {
      await deactivateUser({ uid: confirm.uid });
      setConfirm(null);
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function doReinstate() {
    if (!reinstate) return;
    setBusy(true);
    try {
      await reinstateUser({ uid: reinstate.uid });
      setReinstate(null);
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function doAdminAction() {
    if (!adminAction) return;
    setBusy(true);
    try {
      if (adminAction.type === 'promote') {
        await promoteAdmin({ uid: adminAction.user.uid });
      } else {
        await demoteAdmin({ uid: adminAction.user.uid });
      }
      setAdminAction(null);
    } catch (e: any) {
      Alert.alert('Something went wrong', String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  function renderMember(item: AppUser, i: number) {
    const isEvicted = item.status === 'evicted';
    const missed = item.missedEventCount ?? 0;
    const showAlert = isAdmin && missed >= 2 && !isEvicted;
    const last = item.lastAttendedAt?.toDate?.();
    const isSelf = item.uid === firebaseUser?.uid;
    const canEvict = !isSelf && !item.isAdmin;
    const canDemote = !isSelf && item.isAdmin && !item.isSeedAdmin;
    const canPromote = !item.isAdmin;

    let right: ReactNode = null;
    if (isAdmin && isEvicted) {
      right = (
        <IconButton
          icon="account-reactivate"
          iconColor={palette.primary}
          accessibilityLabel={`Reinstate ${item.firstName}`}
          onPress={() => setReinstate(item)}
        />
      );
    } else if (isAdmin && (canEvict || canPromote || canDemote)) {
      right = (
        <Menu
          visible={menuUid === item.uid}
          onDismiss={() => setMenuUid(null)}
          anchor={
            <IconButton
              icon="dots-vertical"
              accessibilityLabel={`Actions for ${item.firstName}`}
              onPress={() => setMenuUid(item.uid)}
            />
          }
        >
          {canPromote && (
            <Menu.Item
              leadingIcon="shield-account"
              title="Make admin"
              onPress={() => {
                setMenuUid(null);
                setAdminAction({ user: item, type: 'promote' });
              }}
            />
          )}
          {canDemote && (
            <Menu.Item
              leadingIcon="shield-off"
              title="Remove admin"
              onPress={() => {
                setMenuUid(null);
                setAdminAction({ user: item, type: 'demote' });
              }}
            />
          )}
          {canEvict && (
            <Menu.Item
              leadingIcon="account-remove"
              title="Remove member"
              titleStyle={{ color: palette.danger }}
              onPress={() => {
                setMenuUid(null);
                setConfirm(item);
              }}
            />
          )}
        </Menu>
      );
    }

    return (
      <CardRow
        key={item.uid}
        first={i === 0}
        dim={isEvicted}
        title={`${item.firstName} ${item.lastName}`}
        subtitle={
          <>
            {isAdmin && !!item.email && (
              <Text selectable numberOfLines={1} style={cardStyles.muted}>
                {item.email}
              </Text>
            )}
            {isAdmin && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {showAlert ? <Icon source="alert-circle" color={palette.danger} size={14} /> : null}
                <Text style={[cardStyles.muted, showAlert && { color: palette.danger }]}>
                  {last ? `Last attended ${format(last, 'PP')}` : 'No attendance on record'}
                  {missed > 0 && !isEvicted ? ` · missed ${missed}` : ''}
                </Text>
              </View>
            )}
            {!isEvicted && (item.badges?.length ?? 0) > 0 ? (
              <View style={{ marginTop: 4 }}>
                <BadgeList badges={item.badges ?? []} compact />
              </View>
            ) : null}
          </>
        }
        right={right}
      />
    );
  }

  const sections = [
    { title: 'Admins', data: groups.admins },
    { title: 'Members', data: groups.members },
    { title: 'Evicted', data: groups.evicted },
  ].filter((g) => g.data.length > 0);

  return (
    <View style={{ flex: 1 }}>
      {/* Pinned above the list so search stays in reach while scrolling. */}
      <View style={[styles.controls, { paddingBottom: 4 }]}>
        <Searchbar
          placeholder={isAdmin ? 'Search by name or email' : 'Search by name'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ backgroundColor: palette.surface }}
        />
        {/* Sorting by attendance is an admin tool; members just see A–Z. */}
        {isAdmin ? (
          <SegmentedButtons
            value={sort}
            onValueChange={(v) => setSort(v as MemberSort)}
            buttons={[
              { value: 'name', label: 'Name' },
              { value: 'lastAttended', label: 'Last attended' },
            ]}
          />
        ) : null}
      </View>
      {/* Virtualised: only rows near the screen are drawn, so a long roster stays fast. */}
      <SectionList
        sections={sections}
        keyExtractor={(u) => u.uid}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionGap}>
            <SectionHeader title={`${section.title} · ${section.data.length}`} />
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <CardSlice first={index === 0} last={index === section.data.length - 1}>
            {renderMember(item, index)}
          </CardSlice>
        )}
        ListEmptyComponent={
          <Text style={[cardStyles.muted, { paddingTop: 12 }]}>
            {query.trim() ? `No one matches “${query.trim()}”.` : 'No members yet.'}
          </Text>
        }
      />
      <Portal>
        <Dialog visible={!!confirm} onDismiss={() => setConfirm(null)}>
          <Dialog.Title>Remove member?</Dialog.Title>
          <Dialog.Content>
            <Text>
              {confirm?.firstName} {confirm?.lastName} will be marked evicted. They can rejoin by
              attending a future session.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={() => setConfirm(null)} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton variant="text" onPress={remove} loading={busy} tone="danger">
              Remove
            </AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!reinstate} onDismiss={() => setReinstate(null)}>
          <Dialog.Title>Reinstate member?</Dialog.Title>
          <Dialog.Content>
            <Text>
              {reinstate?.firstName} {reinstate?.lastName} will be restored as an active member.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={() => setReinstate(null)} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton variant="text" onPress={doReinstate} loading={busy}>
              Reinstate
            </AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!adminAction} onDismiss={() => setAdminAction(null)}>
          <Dialog.Title>
            {adminAction?.type === 'promote' ? 'Make admin?' : 'Remove admin?'}
          </Dialog.Title>
          <Dialog.Content>
            <Text>
              {adminAction?.type === 'promote'
                ? `${adminAction?.user.firstName} ${adminAction?.user.lastName} will be able to manage members, events, and approvals.`
                : `${adminAction?.user.firstName} ${adminAction?.user.lastName} will lose admin access.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton variant="text" onPress={() => setAdminAction(null)} disabled={busy}>
              Cancel
            </AppButton>
            <AppButton
              variant="text"
              onPress={doAdminAction}
              loading={busy}
              tone={adminAction?.type === 'demote' ? 'danger' : 'default'}
            >
              {adminAction?.type === 'promote' ? 'Make admin' : 'Remove admin'}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sectionGap: { paddingTop: 16, paddingBottom: 8 },
});
