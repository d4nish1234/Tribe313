import { useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDefaultHeaderHeight } from '@react-navigation/elements';
import { Badge, Icon, IconButton, Portal } from 'react-native-paper';
import { router, type Href } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { usePendingCount } from '@/src/hooks/usePendingCount';
import { CardRow } from '@/src/components/Cards';
import { palette } from '@/src/theme';

/**
 * The ☰ menu on the right of every tab's header. It drops a full-width panel
 * down from under the header. Settings is there for everyone; Admin and Coach
 * only for admins. A red bubble on ☰ and on Admin counts pending approvals.
 */
export function HeaderMenu() {
  const { isAdmin } = useAuth();
  const pendingCount = usePendingCount();
  const waiting = isAdmin && pendingCount > 0 ? pendingCount : 0;
  const [visible, setVisible] = useState(false);
  // The panel starts at the bottom of the header: the same sum the tab header
  // uses for its own height (status bar + bar, which differs by device and rotation).
  const top = getDefaultHeaderHeight(useWindowDimensions(), false, useSafeAreaInsets().top);
  const open = () => setVisible(true);
  const close = () => setVisible(false);
  const go = (href: Href) => {
    close();
    router.push(href);
  };

  // Drawn in a Paper Portal (a plain view above the app), not a native Modal:
  // iOS holds a push until a Modal has finished animating away, which made
  // every menu tap feel slow. A Portal closes instantly, so the push starts at once.
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    // Android back button closes the menu instead of leaving the tab.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [visible, fade]);

  return (
    <>
      <View>
        <IconButton
          icon="menu"
          iconColor={palette.text}
          onPress={open}
          accessibilityLabel={waiting ? `Menu, ${waiting} pending approvals` : 'Menu'}
        />
        {waiting ? <Bubble count={waiting} style={styles.iconBubble} /> : null}
      </View>

      {visible ? (
        <Portal>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: fade }]}
            // VoiceOver stays inside the menu (as with a native modal) and the
            // two-finger scrub gesture closes it.
            accessibilityViewIsModal
            onAccessibilityEscape={close}
          >
            {/* Tapping anywhere outside the panel closes it, including the header. */}
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
            <View style={[styles.backdrop, { top }]} pointerEvents="none" />
            <View style={[styles.panel, { top }]}>
              <CardRow
                first
                left={<Icon source="cog-outline" size={22} color={palette.text} />}
                title="Settings"
                onPress={() => go('/settings')}
              />
              {isAdmin ? (
                <>
                  <CardRow
                    left={<Icon source="shield-account-outline" size={22} color={palette.text} />}
                    title="Admin"
                    subtitle={waiting ? `${waiting} waiting for approval` : 'Carpool locations and approvals'}
                    right={waiting ? <Bubble count={waiting} /> : null}
                    onPress={() => go('/admin')}
                  />
                  <CardRow
                    left={<Icon source="clipboard-account-outline" size={22} color={palette.text} />}
                    title="Coach"
                    subtitle="Members' benchmarks and extras"
                    onPress={() => go('/benchmark/coach')}
                  />
                </>
              ) : null}
            </View>
          </Animated.View>
        </Portal>
      ) : null}
    </>
  );
}

/** Red count bubble. Hidden from VoiceOver: the label or subtitle beside it says the number. */
function Bubble({ count, style }: { count: number; style?: object }) {
  return (
    <Badge
      size={18}
      style={[{ backgroundColor: palette.danger }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

const styles = StyleSheet.create({
  iconBubble: { position: 'absolute', top: 4, right: 2 },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: palette.surface,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
