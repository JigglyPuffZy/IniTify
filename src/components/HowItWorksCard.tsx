import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const STEPS = [
  {
    icon: 'cloud-download-outline' as const,
    title: 'Live weather',
    detail: 'Current conditions and heat index for Tuguegarao.',
  },
  {
    icon: 'person-outline' as const,
    title: 'Your profile',
    detail: 'Age, health, and activity so risk advice fits you.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Safety guidance',
    detail: 'Heat-risk level, tips, and what to do next.',
  },
];

export function HowItWorksCard() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>How it works</Text>
      <Text style={styles.subheading}>Automatic · Clear · Local</Text>
      {STEPS.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.iconWrap}>
            <Ionicons name={step.icon} size={20} color={palette.primary} />
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>
              {index + 1}. {step.title}
            </Text>
            <Text style={styles.stepDetail}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: p.borderLight,
      ...cardShadow(),
    },
    heading: {
      ...typography.h2,
      color: p.text,
    },
    subheading: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
    },
    step: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: p.borderLight,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBody: { flex: 1 },
    stepTitle: {
      ...typography.h3,
      color: p.text,
      marginBottom: 2,
    },
    stepDetail: {
      ...typography.bodySm,
      color: p.textSecondary,
    },
  });
}
