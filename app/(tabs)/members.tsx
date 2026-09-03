import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Chip, Dialog, IconButton, List, Menu, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { deactivateUser, demoteAdmin, promoteAdmin, reinstateUser } from '@/src/firebase/fn';
import { BadgeList } from '@/src/components/BadgeList';
import { palette } from '@/src/theme';
import type { AppUser } from '@/src/types';

type SortKey = 'name' | 'lastAttended';

export default function Members() {
  const { isAdmin, firebaseUser } = useAuth();
  const { loading, members } = useMembers(true);
  const [sort, setSort] = useState<SortKey>('name');
  const [confirm, setConfirm] = useState<AppUser | null>(null);
  const [reinstate, setReinstate] = useState<AppUser | null>(null);
  const [adminAction, setAdminAction] = useState<{ user: AppUser; type: 'promote' | 'demote' } | null>(null);
  const [menuUid, setMenuUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => members.filter((m) => m.status === 'approved'), [members]);
  const evicted = useMemo(() => members.filter((m) => m.status === 'evicted'), [members]);

  const byName = (a: AppUser, b: AppUser) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);

  const applySort = (arr: AppUser[]) => {
    const copy = [...arr];
    if (sort === 'name') {
      copy.sort(byName);
    } else {
      copy.sort((a, b) => {
        const at = a.lastAttendedAt?.toMillis?.() ?? 0;
        const bt = b.lastAttendedAt?.toMillis?.() ?? 0;
        return bt - at;
      });
    }
    return copy;
  };

  // Admins are always shown first, alphabetized, so the leadership list reads
  // as a stable roster regardless of the Name/Last attended toggle below.
  const sortedAdmins = useMemo(
    () => [...active].filter((m) => m.isAdmin).sort(byName),
    [active],
  );
  const sortedMembers = useMemo(
    () => applySort(active.filter((m) => !m.isAdmin)),
    [active, sort],
  );

  const sortedEvicted = useMemo(() => [...evicted].sort(byName), [evicted]);

  async function remove() {
    if (!confirm) return;
    setBusy(true);
    try {
      await deactivateUser({ uid: confirm.uid });
      setConfirm(null);
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

  type Row = AppUser | 'evicted-header';
  const data: Row[] = [
    ...sortedAdmins,
    ...sortedMembers,
    ...(isAdmin && sortedEvicted.length > 0 ? (['evicted-header' as const, ...sortedEvicted]) : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <SegmentedButtons
          value={sort}
          onValueChange={(v) => setSort(v as SortKey)}
          buttons={[
            { value: 'name', label: 'Name' },
            { value: 'lastAttended', label: 'Last attended' },
          ]}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(m) => (typeof m === 'string' ? m : m.uid)}
        renderItem={({ item }) => {
          if (item === 'evicted-header') {
            return (
              <Text
                variant="labelMedium"
                style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, opacity: 0.5 }}
              >
                EVICTED
              </Text>
            );
          }

          const isEvicted = item.status === 'evicted';
          const missed = item.missedEventCount ?? 0;
          const showAlert = isAdmin && missed >= 2 && !isEvicted;
          const last = item.lastAttendedAt?.toDate?.();

          return (
            <List.Item
              title={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    variant="bodyLarge"
                    style={isEvicted ? { opacity: 0.45 } : undefined}
                  >
                    {item.firstName} {item.lastName}
                  </Text>
                  {item.isAdmin && !isEvicted && (
                    <Chip compact textStyle={{ color: palette.primary }}>
                      Admin
                    </Chip>
                  )}
                </View>
              )}
              description={() => (
                <View style={{ gap: 4, marginTop: 4 }}>
                  {isAdmin && (
                    <Text style={{ opacity: isEvicted ? 0.35 : 0.7, fontSize: 12 }}>
                      {last ? `Last attended ${format(last, 'PP')}` : 'No attendance on record'}
                      {missed > 0 && !isEvicted ? ` · missed ${missed}` : ''}
                    </Text>
                  )}
                  {!isEvicted && <BadgeList badges={item.badges ?? []} compact />}
                </View>
              )}
              left={() => (
                <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                  {showAlert ? (
                    <IconButton icon="alert-circle" iconColor={palette.danger} size={24} />
                  ) : null}
                </View>
              )}
              right={() => {
                if (!isAdmin) return null;
                if (isEvicted) {
                  return (
                    <IconButton
                      icon="account-reactivate"
                      iconColor={palette.primary}
                      onPress={() => setReinstate(item)}
                    />
                  );
                }

                const isSelf = item.uid === firebaseUser?.uid;
                const canEvict = !isSelf && !item.isAdmin;
                const canDemote = !isSelf && item.isAdmin && !item.isSeedAdmin;
                const canPromote = !item.isAdmin;
                if (!canEvict && !canPromote && !canDemote) return null;

                return (
                  <Menu
                    visible={menuUid === item.uid}
                    onDismiss={() => setMenuUid(null)}
                    anchor={
                      <IconButton icon="dots-vertical" onPress={() => setMenuUid(item.uid)} />
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
              }}
            />
          );
        }}
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
            <Button onPress={() => setConfirm(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onPress={remove} loading={busy} textColor={palette.danger}>
              Remove
            </Button>
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
            <Button onPress={() => setReinstate(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onPress={doReinstate} loading={busy}>
              Reinstate
            </Button>
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
            <Button onPress={() => setAdminAction(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onPress={doAdminAction}
              loading={busy}
              textColor={adminAction?.type === 'demote' ? palette.danger : undefined}
            >
              {adminAction?.type === 'promote' ? 'Make admin' : 'Remove admin'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
