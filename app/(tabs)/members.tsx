import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, IconButton, List, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { deactivateUser, reinstateUser } from '@/src/firebase/fn';
import { BadgeList } from '@/src/components/BadgeList';
import { palette } from '@/src/theme';
import type { AppUser } from '@/src/types';

type SortKey = 'name' | 'lastAttended';

export default function Members() {
  const { isAdmin } = useAuth();
  const { loading, members } = useMembers(true);
  const [sort, setSort] = useState<SortKey>('name');
  const [confirm, setConfirm] = useState<AppUser | null>(null);
  const [reinstate, setReinstate] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => members.filter((m) => m.status === 'approved'), [members]);
  const evicted = useMemo(() => members.filter((m) => m.status === 'evicted'), [members]);

  const sorted = useMemo(() => {
    const arr = [...active];
    if (sort === 'name') {
      arr.sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      );
    } else {
      arr.sort((a, b) => {
        const at = a.lastAttendedAt?.toMillis?.() ?? 0;
        const bt = b.lastAttendedAt?.toMillis?.() ?? 0;
        return bt - at;
      });
    }
    return arr;
  }, [active, sort]);

  const sortedEvicted = useMemo(
    () =>
      [...evicted].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      ),
    [evicted],
  );

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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const data: (AppUser | 'evicted-header')[] = [
    ...sorted,
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
        keyExtractor={(m) => (m === 'evicted-header' ? '__evicted__' : m.uid)}
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
              title={`${item.firstName} ${item.lastName}`}
              titleStyle={isEvicted ? { opacity: 0.45 } : undefined}
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
                return <IconButton icon="account-remove" onPress={() => setConfirm(item)} />;
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
      </Portal>
    </View>
  );
}
