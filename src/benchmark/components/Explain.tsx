import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { tokenize } from '../engine/explain';
import { photoSource } from '../photos';
import { B } from '../theme';
import type { GlossaryEntry } from '../types';
import { BottomSheet } from './BottomSheet';
import { WallSitFigure } from './WallSitFigure';
import { AppButton } from '@/src/components/AppButton';

export interface ExplainContent {
  title: string;
  text?: string;
  steps?: string[];
  standards?: string[] | null;
  photos?: string[] | null;
  figure?: 'wallsit' | 'wallsit1';
}

const Ctx = createContext<(c: ExplainContent) => void>(() => {});

export const useExplain = () => useContext(Ctx);

/** Wrap a screen once; any ExplainText / useExplain() below opens this sheet. */
export function ExplainProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ExplainContent | null>(null);
  const show = useCallback((c: ExplainContent) => setContent(c), []);
  const close = () => setContent(null);
  return (
    <Ctx.Provider value={show}>
      {children}
      <BottomSheet
        visible={!!content}
        onClose={close}
        title={content?.title}
        footer={
          <AppButton
            style={{ marginTop: 8 }}
            onPress={close}
          >
            Got it
          </AppButton>
        }
      >
        {content ? <ExplainBody c={content} /> : null}
      </BottomSheet>
    </Ctx.Provider>
  );
}

function ExplainBody({ c }: { c: ExplainContent }) {
  const sources = (c.photos ?? []).map(photoSource).filter((s): s is number => s !== null);
  return (
    <View style={{ gap: 12 }}>
      {sources.length > 0 ? (
        <View>
          <View style={styles.photos}>
            {sources.map((src, i) => (
              <View key={i} style={styles.photoWrap}>
                <Image source={src} style={styles.photo} contentFit="cover" />
                <Text style={styles.photoLabel}>{i === 0 ? 'Start' : 'Finish'}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.credit}>Photos: Free Exercise DB, public domain</Text>
        </View>
      ) : c.figure ? (
        <View style={{ alignItems: 'center' }}>
          <WallSitFigure size={120} oneLeg={c.figure === 'wallsit1'} />
        </View>
      ) : null}
      {c.text ? <Text style={styles.body}>{c.text}</Text> : null}
      {c.steps?.map((s, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNum}>{i + 1}</Text>
          <Text style={[styles.body, { flex: 1 }]}>{s}</Text>
        </View>
      ))}
      {c.standards?.length ? (
        <View style={styles.standards}>
          {c.standards.map((s, i) => (
            <View key={i} style={styles.standardRow}>
              <Text style={[styles.standardLevel, i === 2 && { color: B.gold }]}>Level {i + 1}</Text>
              <Text style={[styles.body, { flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const underline: TextStyle = {
  textDecorationLine: 'underline',
  textDecorationColor: B.green,
  // Android ignores 'dotted' and draws a solid line, which is fine.
  textDecorationStyle: Platform.OS === 'ios' ? 'dotted' : 'solid',
};

/**
 * Plan text with tappable glossary terms and N×M prescriptions
 * (dotted underline; tap to open a plain-English explanation).
 */
export function ExplainText({
  text,
  glossary,
  style,
}: {
  text: string;
  glossary: GlossaryEntry[];
  style?: TextStyle;
}) {
  const show = useExplain();
  const spans = useMemo(() => tokenize(text, glossary), [text, glossary]);
  return (
    <Text style={[styles.body, style]}>
      {spans.map((s, i) => {
        if (s.kind === 'text') return s.text;
        const onPress =
          s.kind === 'term'
            ? () => show({ title: s.entry.term, text: s.entry.explanation, photos: s.entry.photos })
            : () => show({ title: s.title, text: s.explanation });
        return (
          <Text key={i} style={underline} onPress={onPress} accessibilityRole="button" accessibilityHint="Explains this">
            {s.text}
          </Text>
        );
      })}
    </Text>
  );
}

/** A small "What does this mean?" style link. */
export function InfoLink({ label, onPress, light }: { label: string; onPress: () => void; light?: boolean }) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.link, light && { color: B.goldSoft }]}
      suppressHighlighting
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 23, color: B.text },
  photos: { flexDirection: 'row', gap: 8 },
  photoWrap: { flex: 1 },
  photo: { width: '100%', aspectRatio: 0.75, borderRadius: 8, backgroundColor: B.background },
  photoLabel: { textAlign: 'center', color: B.muted, marginTop: 4, fontSize: 13 },
  credit: { color: B.muted, fontSize: 12, marginTop: 6 },
  step: { flexDirection: 'row', gap: 10 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    backgroundColor: B.greenSoft,
    color: B.green,
    fontWeight: '700',
    overflow: 'hidden',
  },
  standards: { backgroundColor: B.background, borderRadius: 10, padding: 12, gap: 6 },
  standardRow: { flexDirection: 'row', gap: 10 },
  standardLevel: { width: 64, fontWeight: '700', color: B.green },
  link: { color: B.green, textDecorationLine: 'underline', fontSize: 14, paddingVertical: 4 },
});
