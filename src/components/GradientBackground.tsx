import { useMemo } from 'react';

import { StyleSheet, View, type ViewStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/src/theme/useAppTheme';

import type { AppPalette } from '@/src/theme/palettes';



type GradientVariant = 'hero' | 'heroSoft' | 'warm';



interface GradientBackgroundProps {

  variant?: GradientVariant;

  style?: ViewStyle;

  children?: React.ReactNode;

}



export function GradientBackground({

  variant = 'hero',

  style,

  children,

}: GradientBackgroundProps) {

  const { palette, isDark } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);



  const colors =

    variant === 'hero'

      ? palette.heroGradient

      : variant === 'heroSoft'

        ? ([palette.primary, palette.heroGradient[1]] as const)

        : ([palette.primary, palette.warning] as const);



  return (

    <LinearGradient

      colors={[...colors]}

      start={{ x: 0, y: 0 }}

      end={{ x: 1, y: 1 }}

      style={[styles.fill, style]}

    >

      <View style={[styles.glowTop, isDark && styles.glowTopDark]} />

      <View style={styles.glowBottom} />

      {children}

    </LinearGradient>

  );

}



function createStyles(p: AppPalette) {

  return StyleSheet.create({

    fill: { flex: 1 },

    glowTop: {

      position: 'absolute',

      top: -80,

      right: -40,

      width: 200,

      height: 200,

      borderRadius: 999,

      backgroundColor: 'rgba(255,255,255,0.12)',

    },

    glowTopDark: {

      backgroundColor: 'rgba(255,255,255,0.06)',

    },

    glowBottom: {

      position: 'absolute',

      bottom: 40,

      left: -60,

      width: 160,

      height: 160,

      borderRadius: 999,

      backgroundColor: 'rgba(255,255,255,0.08)',

    },

  });

}


