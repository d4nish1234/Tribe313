import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Icon, Searchbar, Text } from 'react-native-paper';
import { Stack, router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { CardRow, CardSlice, cardStyles } from '@/src/components/Cards';
import { AppButton } from '@/src/components/AppButton';
import { currentPick, filterPickItems, finishPick, subscribePick, type PickRequest } from '@/src/lib/picker';
import { palette } from '@/src/theme';

type Row = { kind: 'custom'; text: string } | { kind: 'item'; id: string; title: string; subtitle?: string | null };

/**
 * The search-and-select screen. Don't navigate here directly: call pickOne or
 * pickMany from src/lib/picker.ts, which explains the options.
 */
export default function PickScreen() {
  // The request this screen shows. It moves to a newer request if one starts
  // while the screen is open (this route is singular, so a double tap on a
  // picker reuses it), but never back to null, so the screen doesn't go blank
  // while it animates away after a choice.
  const [req, setReq] = useState(currentPick);
  useEffect(() => {
    const follow = () => {
      const next = currentPick();
      if (next) setReq(next);
    };
    follow(); // in case it changed between the first render and this effect
    return subscribePick(follow);
  }, []);

  if (!req) {
    return (
      <View style={styles.center}>
        <Text style={cardStyles.muted}>Nothing to choose from.</Text>
        <AppButton variant="text" onPress={() => router.back()}>
          Go back
        </AppButton>
      </View>
    );
  }
  // Keyed by request, so a newer request starts with a fresh search and ticks.
  return <PickBody key={req.key} req={req} />;
}

function PickBody({ req }: { req: PickRequest }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>(req.selected ?? []);
  const closing = useRef(false);

  // Leaving without choosing (Back button, swipe back) counts as cancel. This
  // listens for the screen being removed rather than using an effect cleanup,
  // which React can run early in development. After a choice it's a no-op.
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  useEffect(() => navigation.addListener('beforeRemove', () => finishPick(req.key, null)), [navigation, req]);

  const rows = useMemo<Row[]>(() => {
    const { custom, items } = filterPickItems(req.items, query, req.allowCustom);
    return [
      ...(custom ? [{ kind: 'custom' as const, text: custom }] : []),
      ...items.map((it) => ({ kind: 'item' as const, id: it.id, title: it.title, subtitle: it.subtitle })),
    ];
  }, [req, query]);

  // Close once only: a quick second tap would otherwise go back twice and
  // also pop the screen that opened the picker.
  const close = (ids: string[]) => {
    if (closing.current) return;
    closing.current = true;
    finishPick(req.key, ids);
    router.back();
  };

  const choose = (id: string) => {
    if (req.multiple) {
      setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
      return;
    }
    close([id]);
  };

  const done = () => close(chosen);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: req.title }} />
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder={req.searchPlaceholder ?? 'Search'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ backgroundColor: palette.surface }}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'custom' ? '__custom' : r.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.list, { paddingBottom: (req.multiple ? 96 : 24) + insets.bottom }]}
        ListEmptyComponent={
          <Text style={[cardStyles.muted, { paddingTop: 8 }]}>
            {query.trim() ? `Nothing matches “${query.trim()}”.` : req.emptyText ?? 'Nothing to choose from.'}
          </Text>
        }
        renderItem={({ item: r, index }) => {
          const id = r.kind === 'custom' ? r.text : r.id;
          const ticked = chosen.includes(id);
          return (
            <CardSlice first={index === 0} last={index === rows.length - 1}>
              <CardRow
                first={index === 0}
                title={r.kind === 'custom' ? `Use “${r.text}”` : r.title}
                subtitle={r.kind === 'custom' ? 'Not in the list: use what you typed' : r.subtitle}
                onPress={() => choose(id)}
                chevron={req.multiple ? null : 'forward'}
                accessibilityRole={req.multiple ? 'checkbox' : 'button'}
                accessibilityState={req.multiple ? { checked: ticked } : { selected: ticked }}
                right={
                  req.multiple || ticked ? (
                    <Icon
                      source={ticked ? 'check-circle' : 'circle-outline'}
                      color={ticked ? palette.primary : palette.muted}
                      size={24}
                    />
                  ) : null
                }
              />
            </CardSlice>
          );
        }}
      />
      {req.multiple ? (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          <AppButton onPress={done}>{chosen.length ? `Done · ${chosen.length} selected` : 'Done'}</AppButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: palette.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
});
