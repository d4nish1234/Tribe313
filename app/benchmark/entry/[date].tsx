import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Snackbar, Text } from 'react-native-paper';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/contexts/AuthContext';
import { getVersion, latestVersion } from '@/src/benchmark/registry';
import { useBenchmarkProfile, useBenchmarkSessions, useEntryDraft, type EntryDraft } from '@/src/benchmark/hooks';
import { deleteSession, saveSession } from '@/src/benchmark/data';
import { formatDate, formatFtIn, formatValue, fromIsoDate, toIsoDate } from '@/src/benchmark/engine/format';
import { ExplainProvider, InfoLink, useExplain } from '@/src/benchmark/components/Explain';
import { CrossfadeThumb, testExplainContent } from '@/src/benchmark/components/Bits';
import { PickerSheet } from '@/src/benchmark/components/PickerSheet';
import { B, TAP } from '@/src/benchmark/theme';
import type { BenchmarkVersion, Session } from '@/src/benchmark/types';
import { AppButton } from '@/src/components/AppButton';

const NOTE_SEEN_KEY = 'benchmark:testDayNoteSeen';

type Form = EntryDraft;

const emptyForm = (): Form => ({ bodyweight: null, heightIn: null, results: {}, wallSquatFaults: [] });

function formFromSession(s: Session): Form {
  return {
    bodyweight: s.bodyweight,
    heightIn: s.heightIn,
    results: { ...s.results },
    wallSquatFaults: [...(s.wallSquatFaults ?? [])],
  };
}

/** Most recent result for a test, skipping the benchmark being edited. */
function lastResult(sessions: Session[], key: string, skipDate: string | null): number | null {
  for (const s of sessions) {
    if (s.date === skipDate) continue;
    const v = s.results?.[key];
    if (typeof v === 'number') return v;
  }
  return null;
}

export default function EntryScreen() {
  return (
    <ExplainProvider>
      <Entry />
    </ExplainProvider>
  );
}

function Entry() {
  const params = useLocalSearchParams<{ date: string }>();
  const { appUser, firebaseUser } = useAuth();
  const uid = firebaseUser?.uid;
  const insets = useSafeAreaInsets();
  const explain = useExplain();

  const { loading: sLoading, sessions } = useBenchmarkSessions(uid);
  const { loading: pLoading, profile } = useBenchmarkProfile(uid);

  // Which saved benchmark this screen is editing (null = not saved yet).
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const [date, setDate] = useState<string>(params.date === 'new' ? toIsoDate(new Date()) : params.date);
  const [version, setVersion] = useState<number>(latestVersion().version);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saved, setSaved] = useState<Form | null>(null);
  const [ready, setReady] = useState(false);

  const draftKey = savedDate ?? 'new';
  const { loaded: draftLoaded, draft, write: writeDraft, clear: clearDraft } = useEntryDraft(uid, draftKey);

  const [picking, setPicking] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(true);
  const [inited, setInited] = useState(false);
  const draftApplied = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTE_SEEN_KEY)
      .then((v) => {
        if (v) setNoteOpen(false);
        else AsyncStorage.setItem(NOTE_SEEN_KEY, '1').catch(() => {});
      })
      .catch(() => {});
  }, []);

  // Initialise once: the saved benchmark for this date (if any), then any device draft on top.
  useEffect(() => {
    if (inited || sLoading || pLoading) return;
    const target = params.date === 'new' ? toIsoDate(new Date()) : params.date;
    const existing = sessions.find((s) => s.date === target) ?? null;
    if (existing) {
      setSavedDate(existing.date);
      setVersion(existing.version);
      const f = formFromSession(existing);
      if (f.heightIn == null) f.heightIn = profile?.heightIn ?? null;
      setForm(f);
      setSaved(formFromSession(existing));
    } else {
      const f = emptyForm();
      f.bodyweight = sessions[0]?.bodyweight ?? null;
      f.heightIn = profile?.heightIn ?? null;
      setForm(f);
    }
    setInited(true);
  }, [inited, sLoading, pLoading, sessions, profile, params.date]);

  // Apply the device draft for this benchmark once it's loaded (after init).
  useEffect(() => {
    if (!inited || draftApplied.current || !draftLoaded) return;
    draftApplied.current = true;
    if (draft) {
      const { date: draftDate, writtenOn: _writtenOn, ...rest } = draft;
      setForm((f) => ({ ...f, ...rest, results: { ...f.results, ...rest.results } }));
      if (draftDate) setDate(draftDate);
      setToast('Restored your unsaved results');
    }
    setReady(true);
  }, [inited, draftLoaded, draft]);

  const v: BenchmarkVersion | null = getVersion(version);
  const readOnly = !v;

  const update = (patch: Partial<Form>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      writeDraft({ ...next, date });
      return next;
    });
  };

  const setResult = (key: string, value: number | null) =>
    update({ results: { ...form.results, [key]: value } });

  // What's changed since the last save.
  const changed = useMemo(() => {
    const base = saved ?? emptyForm();
    const resultKeys = (v?.logOrder ?? []).filter(
      (k) => (form.results[k] ?? null) !== (base.results[k] ?? null),
    );
    const newResults = resultKeys.filter((k) => form.results[k] != null);
    const other =
      form.bodyweight !== base.bodyweight ||
      form.heightIn !== base.heightIn ||
      [...form.wallSquatFaults].sort().join() !== [...base.wallSquatFaults].sort().join() ||
      (savedDate !== null && date !== savedDate);
    return { resultKeys: new Set(resultKeys), newCount: newResults.length, any: resultKeys.length > 0 || other || !saved };
  }, [form, saved, savedDate, date, v]);

  const hasAnyResult = Object.values(form.results).some((x) => typeof x === 'number');
  const dirty = changed.any && (hasAnyResult || saved !== null);

  const save = async () => {
    if (!uid || !v) return;
    if (form.bodyweight == null) return Alert.alert('Add your bodyweight', 'Bodyweight is needed to score some tests.');
    if (!hasAnyResult) return Alert.alert('Add a result', 'Enter at least one test result first.');
    if (typeof form.results.bj === 'number' && form.heightIn == null)
      return Alert.alert('Add your height', 'The broad jump is scored against your height.');

    const moving = savedDate !== null && date !== savedDate;
    const collides = sessions.some((s) => s.date === date && s.date !== savedDate);
    if (collides) {
      const ok = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Replace that benchmark?',
          `You already have a benchmark on ${formatDate(date)}. Saving will replace it.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Replace', style: 'destructive', onPress: () => resolve(true) },
          ],
        ),
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      await saveSession({
        uid,
        name: appUser ? `${appUser.firstName} ${appUser.lastName}`.trim() : '',
        session: {
          date,
          version,
          bodyweight: form.bodyweight,
          heightIn: form.heightIn,
          results: Object.fromEntries(v.logOrder.map((k) => [k, form.results[k] ?? null])),
          wallSquatFaults: form.wallSquatFaults,
        },
        previousDate: savedDate,
        isNew: savedDate === null,
        // Only touch the profile height if it was changed here or was never set.
        profileHeightIn:
          form.heightIn != null && (form.heightIn !== (saved?.heightIn ?? null) || profile?.heightIn == null)
            ? form.heightIn
            : undefined,
      });
      clearDraft(draftKey);
      if (moving || savedDate === null) clearDraft(date);
      setSavedDate(date);
      setSaved({ ...form, results: { ...form.results }, wallSquatFaults: [...form.wallSquatFaults] });
      setToast('Saved ✓');
    } catch (e: any) {
      Alert.alert('Couldn’t save', `${e?.message ?? e}\n\nYour results are kept on this phone. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!uid || !savedDate) return;
    Alert.alert('Delete this benchmark?', `${formatDate(savedDate)} will be removed. This can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSession(uid, savedDate);
            clearDraft(savedDate);
            router.back();
          } catch (e: any) {
            Alert.alert('Couldn’t delete', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const onDateChange = (iso: string) => {
    if (iso === date) return;
    setDate(iso);
    writeDraft({ ...form, date: iso });
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Benchmark' }} />
        <ActivityIndicator />
      </View>
    );
  }

  const pickerKey = picking;
  const pickerSpec = pickerKey && v ? v.picker(pickerKey) : null;
  const pickerValue =
    pickerKey === 'bw' ? form.bodyweight : pickerKey === 'height' ? form.heightIn : pickerKey ? form.results[pickerKey] ?? null : null;
  const pickerFallback =
    pickerKey && v
      ? pickerKey === 'bw' || pickerKey === 'height'
        ? v.pickerDefault(pickerKey)
        : lastResult(sessions, pickerKey, savedDate) ?? v.pickerDefault(pickerKey)
      : 0;

  const showHeightRow = profile?.heightIn == null || form.heightIn == null;

  return (
    <View style={{ flex: 1, backgroundColor: B.background }}>
      <Stack.Screen
        options={{
          title: formatDate(date),
        }}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}>
        {readOnly ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>This benchmark was saved in a newer version. Update the app to see or edit it.</Text>
          </View>
        ) : null}

        <Pressable style={styles.note} onPress={() => setNoteOpen((o) => !o)} accessibilityRole="button">
          <View style={styles.rowBetween}>
            <Text style={styles.noteTitle}>Benchmark day</Text>
            <Text style={styles.muted}>{noteOpen ? 'Hide' : 'Show'}</Text>
          </View>
          {noteOpen ? (
            <View style={{ gap: 6, marginTop: 6 }}>
              <Text style={styles.bullet}>• Do the tests in any order the gym allows. The list isn’t a set order.</Text>
              <Text style={styles.bullet}>
                • Warm up 10 minutes first: 5 min easy bike or jog, then mobility. Do a few light practice reps before each
                heavy test.
              </Text>
              <Text style={styles.bullet}>• Tap a picture to see how a test is done. Tap a box to enter your result.</Text>
            </View>
          ) : null}
        </Pressable>

        <Text style={styles.group}>Details</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Date</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={fromIsoDate(date)}
                mode="date"
                display="compact"
                maximumDate={new Date()}
                disabled={readOnly}
                onChange={(_, d) => d && onDateChange(toIsoDate(d))}
                accentColor={B.green}
              />
            ) : (
              <Pressable style={styles.box} onPress={() => !readOnly && setShowDate(true)} accessibilityRole="button">
                <Text style={styles.boxText}>{formatDate(date)}</Text>
              </Pressable>
            )}
          </View>
          {showDate && Platform.OS === 'android' ? (
            <DateTimePicker
              value={fromIsoDate(date)}
              mode="date"
              maximumDate={new Date()}
              onChange={(e, d) => {
                setShowDate(false);
                if (e.type === 'set' && d) onDateChange(toIsoDate(d));
              }}
            />
          ) : null}
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Bodyweight</Text>
              <InfoLink label="Why?" onPress={() => v && explain(v.explainer('bw'))} />
            </View>
            <ResultBox
              text={form.bodyweight != null ? `${form.bodyweight} lb` : null}
              unsaved={form.bodyweight !== (saved?.bodyweight ?? null)}
              onPress={() => !readOnly && setPicking('bw')}
              label="Bodyweight"
            />
          </View>
          {showHeightRow ? (
            <>
              <View style={styles.divider} />
              <View style={styles.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Height</Text>
                  <InfoLink label="Why?" onPress={() => v && explain(v.explainer('height'))} />
                </View>
                <ResultBox
                  text={form.heightIn != null ? formatFtIn(form.heightIn) : null}
                  unsaved={form.heightIn !== (saved?.heightIn ?? null)}
                  onPress={() => !readOnly && setPicking('height')}
                  label="Height"
                />
              </View>
            </>
          ) : null}
        </View>

        {v ? (
          <>
            <View style={[styles.rowBetween, { marginTop: 16 }]}>
              <Text style={styles.group}>Results</Text>
              <InfoLink label="How this works" onPress={() => explain(v.explainer('howlog'))} />
            </View>
            <View style={styles.card}>
              {v.logOrder.map((key, i) => {
                const t = v.tests[key];
                const value = form.results[key] ?? null;
                return (
                  <View key={key}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.testRow}>
                      <CrossfadeThumb
                        photos={t.photos}
                        figure={key === 'ws1' ? 'wallsit1' : 'wallsit'}
                        label={t.name}
                        onPress={() => explain(testExplainContent(v, key))}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.testName}>{t.name}</Text>
                        {t.note ? <Text style={styles.muted}>{t.note}</Text> : null}
                      </View>
                      <ResultBox
                        text={value != null ? formatValue(t.input, value) : null}
                        unsaved={changed.resultKeys.has(key)}
                        onPress={() => setPicking(key)}
                        label={t.name}
                      />
                    </View>
                    {key === 'splat' ? (
                      <View style={styles.faults}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.muted}>What stopped you?</Text>
                          <InfoLink label="Why?" onPress={() => explain(v.explainer('faults'))} />
                        </View>
                        <View style={styles.chips}>
                          {Object.entries(v.faults).map(([fk, f]) => {
                            const on = form.wallSquatFaults.includes(fk);
                            return (
                              <Chip
                                key={fk}
                                selected={on}
                                showSelectedCheck
                                onPress={() =>
                                  update({
                                    wallSquatFaults: on
                                      ? form.wallSquatFaults.filter((x) => x !== fk)
                                      : [...form.wallSquatFaults, fk],
                                  })
                                }
                                style={[styles.chip, on && { backgroundColor: B.greenSoft }]}
                                compact
                              >
                                {f.buttonLabel}
                              </Chip>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {savedDate ? (
          <AppButton
            variant="secondary"
            icon="trash-can-outline"
            tone="danger"
            style={styles.deleteBtn}
            onPress={remove}
            disabled={saving}
          >
            Delete this benchmark
          </AppButton>
        ) : null}
      </ScrollView>

      {!readOnly ? (
        <View style={[styles.saveBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppButton
            loading={saving}
            disabled={saving || !dirty}
            onPress={save}
          >
            {!dirty
              ? 'All saved ✓'
              : changed.newCount > 0
                ? `Save ${changed.newCount} new result${changed.newCount === 1 ? '' : 's'}`
                : 'Save changes'}
          </AppButton>
        </View>
      ) : null}

      <PickerSheet
        spec={pickerSpec}
        visible={!!pickerKey}
        value={pickerValue}
        fallback={pickerFallback}
        clearable={pickerKey !== 'bw' && pickerKey !== 'height'}
        onClose={() => setPicking(null)}
        onDone={(val) => {
          if (pickerKey === 'bw') update({ bodyweight: val });
          else if (pickerKey === 'height') update({ heightIn: val });
          else if (pickerKey) setResult(pickerKey, val);
          setPicking(null);
        }}
      />

      <Snackbar visible={!!toast} onDismiss={() => setToast(null)} duration={2000} style={{ marginBottom: 90 + insets.bottom }}>
        {toast ?? ''}
      </Snackbar>
    </View>
  );
}

function ResultBox({
  text,
  unsaved,
  onPress,
  label,
}: {
  text: string | null;
  unsaved: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${text ?? 'empty'}`}
      accessibilityHint={text ? 'Change result' : 'Add result'}
      style={[styles.box, !text && styles.boxEmpty, unsaved && text != null && styles.boxUnsaved]}
    >
      <Text style={[styles.boxText, !text && { color: B.muted, fontWeight: '400' }]}>{text ?? 'Tap to add'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { marginTop: 24, borderColor: B.danger },
  content: { padding: 16, gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  notice: { backgroundColor: B.goldSoft, padding: 12, borderRadius: 10 },
  noticeText: { color: B.text },
  note: { backgroundColor: B.greenSoft, borderRadius: 12, padding: 12, minHeight: TAP },
  noteTitle: { fontWeight: '700', color: B.green, fontSize: 16 },
  bullet: { color: B.text, lineHeight: 21 },
  group: { fontSize: 13, fontWeight: '700', color: B.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  card: { backgroundColor: B.surface, borderRadius: 12, paddingHorizontal: 12 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, gap: 12 },
  fieldLabel: { fontSize: 16, color: B.text, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: B.border },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  testName: { fontSize: 16, fontWeight: '600', color: B.text },
  muted: { color: B.muted, fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  box: {
    minWidth: 96,
    minHeight: TAP,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: B.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: B.surface,
  },
  boxEmpty: { borderStyle: 'dashed', borderColor: B.muted },
  boxUnsaved: { borderWidth: 2.5, borderColor: B.green },
  boxText: { fontSize: 16, fontWeight: '600', color: B.text, fontVariant: ['tabular-nums'] },
  faults: { paddingBottom: 12, gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: B.background },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(246,246,244,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: B.border,
  },
});
