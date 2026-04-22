import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, IconButton, List, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useAuth } from '@/src/contexts/AuthContext';
import { useMembers } from '@/src/hooks/useMembers';
import { deactivateUser } from '@/src/firebase/fn';
import { BadgeList } from '@/src/components/BadgeList';
import { palette } from '@/src/theme';
import type { AppUser } from '@/src/types';

type SortKey = 'name' | 'lastAttended';

export default function Members() {
  const { isAdmin } = useAuth();
  const { loading, members } = useMembers();
  const [sort, setSort] = useState<SortKey>('name');
  const [confirm, setConfirm] = useState<AppUser | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...members];
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
  }, [members, sort]);

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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

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
        data={sorted}
        keyExtractor={(m) => m.uid}
        renderItem={({ item }) => {
          const missed = item.missedEventCount ?? 0;
          const showAlert = isAdmin && missed >= 2;
          const last = item.lastAttendedAt?.toDate?.();
          return (
            <List.Item
              title={`${item.firstName} ${item.lastName}`}
              description={() => (
                <View style={{ gap: 4, marginTop: 4 }}>
                  {isAdmin && (
                    <Text style={{ opacity: 0.7, fontSize: 12 }}>
                      {last ? `Last attended ${format(last, 'PP')}` : 'No attendance on record'}
                      {missed > 0 ? ` · missed ${missed}` : ''}
                    </Text>
                  )}
                  <BadgeList badges={item.badges ?? []} compact />
                </View>
              )}
              left={() => (
                <View style={{ width: 32, alignItems: 'center', justifyContent: 'center' }}>
                  {showAlert ? (
                    <IconButton icon="alert-circle" iconColor={palette.danger} size={24} />
                  ) : null}
                </View>
              )}
              right={() =>
                isAdmin ? (
                  <IconButton icon="account-remove" onPress={() => setConfirm(item)} />
                ) : null
              }
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
      </Portal>
    </View>
  );
}
