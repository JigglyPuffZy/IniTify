import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';
import {
  SPLASH_FADE_OUT_MS,
  SPLASH_INTRO_MS,
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  authHeroGradientDark,
  brand,
  splashBackground,
  splashGradient,
} from './auth-brand';
import { spacing } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';

interface BrandedSplashProps {
  onFinish: () => void;
  sessionReady?: boolean;
  style?: StyleProp<ViewStyle>;
}

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const easeIn = Easing.bezier(0.4, 0, 1, 1);

/**
 * Branded launch splash — matches Login hero (gradient, glows, icon, type).
 * Sequence: logo fade/scale → subtle pulse → fade to Login.
 */
export function BrandedSplash({
  onFinish,
  sessionReady = true,
  style,
}: BrandedSplashProps) {
  const { isDark } = useAppTheme();
  const gradient = useMemo(
    () => (isDark ? authHeroGradientDark : splashGradient),
    [isDark],
  );

  const intro = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const nativeHidden = useRef(false);
  const minElapsed = useRef(false);

  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const sessionReadyRef = useRef(sessionReady);
  onFinishRef.current = onFinish;
  sessionReadyRef.current = sessionReady;

  const hideNativeSplash = useCallback(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    void ExpoSplashScreen.hideAsync();
  }, []);

  const finishSplash = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: SPLASH_FADE_OUT_MS,
      easing: easeIn,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onFinishRef.current();
    });
  }, [screenOpacity]);

  useEffect(() => {
    hideNativeSplash();

    const introAnim = Animated.timing(intro, {
      toValue: 1,
      duration: SPLASH_INTRO_MS,
      easing: easeOut,
      useNativeDriver: true,
    });

    introAnim.start();

    const exitTimer = setTimeout(() => {
      minElapsed.current = true;
      if (sessionReadyRef.current) finishSplash();
    }, SPLASH_MIN_MS);
    const maxTimer = setTimeout(finishSplash, SPLASH_MAX_MS);

    return () => {
      introAnim.stop();
      clearTimeout(exitTimer);
      clearTimeout(maxTimer);
    };
  }, [finishSplash, hideNativeSplash, intro]);

  useEffect(() => {
    if (sessionReady && minElapsed.current) finishSplash();
  }, [finishSplash, sessionReady]);

  const iconOpacity = intro.interpolate({
    inputRange: [0, 0.4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const iconScale = intro.interpolate({
    inputRange: [0, 0.45],
    outputRange: [0.8, 1],
    extrapolate: 'clamp',
  });

  const titleY = intro.interpolate({
    inputRange: [0.38, 0.72],
    outputRange: [14, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.overlay, style, { opacity: screenOpacity }]}
      pointerEvents="auto"
      accessibilityRole="image"
      accessibilityLabel="IniTify"
      onLayout={hideNativeSplash}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.logoStage}>
            <Animated.View
              style={{
                opacity: iconOpacity,
                transform: [{ scale: iconScale }, { translateY: titleY }],
              }}
            >
              <BrandMark size={168} />
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
    backgroundColor: splashBackground,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  logoStage: {
    width: 220,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
