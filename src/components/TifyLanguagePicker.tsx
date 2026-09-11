import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/src/components/auth/BrandMark';
import {
  TIFY_LANGUAGE_OPTIONS,
  type TifyLanguagePreference,
} from '@/src/constants/tify-language-preference';
import { fonts, radius, spacing, typography } from '@/src/theme';
import { cardShadow } from '@/src/theme/shadows';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { useResponsive } from '@/src/utils/responsive';

interface TifyLanguagePickerProps {
  onSelect: (language: TifyLanguagePreference) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
}

export function TifyLanguagePicker({
  onSelect,
  onClose,
  title = 'Choose your language',
  subtitle = 'Piliin ang wika para kay Tify. You can change this later.',
}: TifyLanguagePickerProps) {
  const { palette, isDark } = useAppTheme();
  const { horizontalPadding } = useResponsive();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1E3A8A'] : ['#EFF6FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={[styles.safe, { paddingHorizontal: horizontalPadding }]} edges={['top', 'bottom']}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={palette.text} />
          </Pressable>
        ) : (
          <View style={styles.closeSpacer} />
        )}

        <View style={styles.hero}>
          <BrandMark size={72} />
          <Text style={styles.overline}>Tify · Heat check-in</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.options}>
          {TIFY_LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [styles.optionCard, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={option.title}
            >
              <View style={styles.optionIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={palette.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                <Text style={styles.optionSample}>"{option.sample}"</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(palette: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.background },
    safe: { flex: 1 },
    closeBtn: {
      alignSelf: 'flex-start',
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    closeSpacer: { height: 40 },
    pressed: { opacity: 0.85 },
    hero: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    overline: {
      ...typography.caption,
      color: palette.primary,
      fontFamily: fonts.bodySemiBold,
      marginTop: spacing.md,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      ...typography.h1,
      color: palette.text,
      fontFamily: fonts.header,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: palette.textMuted,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: 22,
      maxWidth: 320,
    },
    options: { gap: spacing.md },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: palette.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      ...cardShadow(),
    },
    optionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: palette.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionText: { flex: 1, gap: 2 },
    optionTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 17,
      color: palette.text,
    },
    optionSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: palette.textMuted,
    },
    optionSample: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: palette.primary,
      marginTop: 4,
      fontStyle: 'italic',
    },
  });
}
