import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { B } from '../theme';

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  const reduceMotion = useReducedMotion();

  // The backdrop fades in place while only the sheet slides up; closing
  // plays the reverse before the Modal unmounts.
  // The Modal is a full-screen native layer: if it stayed mounted after
  // closing it would swallow every tap, the header Back button included. So
  // unmount whenever the close ends, even if the animation was interrupted,
  // unless the sheet was reopened in the meantime.
  const [mounted, setMounted] = useState(visible);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (!visibleRef.current) setMounted(false);
    });
  }, [visible, progress]);
  useEffect(() => {
    if (!mounted || !visible) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mounted, visible, progress]);

  const slide = reduceMotion ? 0 : Dimensions.get('window').height;
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [slide, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
            reduceMotion ? { opacity: progress } : { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.grabber} />
          {title ? (
            <Text variant="titleLarge" style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Body style={scroll ? styles.scroll : undefined} contentContainerStyle={scroll ? { paddingBottom: 8 } : undefined}>
            {children}
          </Body>
          {footer}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: B.backdrop },
  sheet: {
    backgroundColor: B.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: B.border, marginBottom: 8 },
  title: { fontWeight: '700', color: B.text },
  subtitle: { color: B.muted, marginTop: 2 },
  scroll: { marginTop: 12 },
});
