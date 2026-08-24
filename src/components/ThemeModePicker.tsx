import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, platformShadow, surfaceShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { ThemePreference } from '@/src/context/ThemeContext';
import type { AppPalette } from '@/src/theme/palettes';

const OPTIONS: { value: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export function ThemeModePicker() {
  const { palette, isDark, preference, setPreference } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelIcon}>
          <Ionicons name="contrast-outline" size={18} color={palette.primary} />
        </View>
        <View style={styles.labelText}>
          <Text style={styles.labelTitle}>Appearance</Text>
          <Text style={styles.labelDesc}>Choose light, dark, or match your device</Text>
        </View>
      </View>
      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [
                styles.segmentBtn,
                active && styles.segmentBtnActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={option.icon}
                size={16}
                color={active ? palette.primary : palette.textMuted}
              />
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: p.border,
      padding: spacing.lg,
      gap: spacing.lg,
      ...surfaceShadow(isDark),
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    labelIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    labelText: { flex: 1, gap: 2 },
    labelTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: p.text,
    },
    labelDesc: {
      ...typography.caption,
      color: p.textMuted,
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: p.surfaceInset,
      borderRadius: radius.md,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: radius.sm,
    },
    segmentBtnActive: {
      backgroundColor: p.surface,
      ...platformShadow({
        color: '#000000',
        offsetY: 1,
        opacity: isDark ? 0.3 : 0.08,
        radius: 4,
        elevation: 2,
      }),
    },
    segmentLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: p.textMuted,
    },
    segmentLabelActive: {
      color: p.primary,
    },
    pressed: { opacity: 0.85 },
  });
}
