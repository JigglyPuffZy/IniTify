import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

export type UserStepId = 'profile' | 'heat' | 'assess';

export interface UserStep {
  id: UserStepId;
  label: string;
  hint: string;
  done: boolean;
}

interface WhatsHappeningCardProps {
  steps: UserStep[];
  currentStep: UserStep | null;
  onStepAction?: (stepId: UserStepId) => void;
}

export function WhatsHappeningCard({
  steps,
  currentStep,
  onStepAction,
}: WhatsHappeningCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>What&apos;s next</Text>
          <Text style={styles.subtitle}>
            {doneCount} of {steps.length} done
          </Text>
        </View>
        <View style={styles.progressRing}>
          <Text style={styles.progressText}>
            {doneCount}/{steps.length}
          </Text>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Ionicons name="bulb-outline" size={18} color={palette.primary} />
        <Text style={styles.summaryText}>
          {currentStep
            ? `Do this next: ${currentStep.label}. ${currentStep.hint}`
            : 'You are all set for now. Check the Weather tab and your risk level below.'}
        </Text>
      </View>

      {steps.map((step, index) => (
        <Pressable
          key={step.id}
          style={[styles.stepRow, step.id === currentStep?.id && styles.stepRowActive]}
          onPress={() => onStepAction?.(step.id)}
          disabled={!onStepAction}
        >
          <View
            style={[
              styles.stepIcon,
              step.done ? styles.stepIconDone : styles.stepIconPending,
            ]}
          >
            {step.done ? (
              <Ionicons name="checkmark" size={16} color={palette.onHero} />
            ) : (
              <Text style={styles.stepNumber}>{index + 1}</Text>
            )}
          </View>
          <View style={styles.stepBody}>
            <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
              {step.label}
            </Text>
            {!step.done ? <Text style={styles.stepHint}>{step.hint}</Text> : null}
          </View>
          {!step.done && step.id === currentStep?.id ? (
            <Ionicons name="arrow-forward-circle" size={22} color={palette.primary} />
          ) : null}
        </Pressable>
      ))}

      <Text style={styles.footerNote}>Weather for Tuguegarao City.</Text>
    </View>
  );
}

export function buildUserSteps(params: {
  hasProfile: boolean;
  hasHeatReading: boolean;
  hasAssessment: boolean;
  devManualHeat: boolean;
}): { steps: UserStep[]; currentStep: UserStep | null } {
  const steps: UserStep[] = [
    {
      id: 'profile',
      label: 'Set up your profile',
      hint: 'Name, age, and health info so advice fits you.',
      done: params.hasProfile,
    },
  ];

  if (params.devManualHeat) {
    steps.push({
      id: 'heat',
      label: 'Enter today\'s heat index',
      hint: 'Type the temperature (e.g. 38) in the box below — demo for thesis.',
      done: params.hasHeatReading,
    });
  }

  steps.push({
    id: 'assess',
    label: 'Run your risk assessment',
    hint: 'Tap the button to see if heat risk is Low, Moderate, High, or Critical.',
    done: params.hasAssessment,
  });

  const currentStep = steps.find((s) => !s.done) ?? null;

  return { steps, currentStep };
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
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h2,
      color: p.text,
    },
    subtitle: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 4,
    },
    progressRing: {
      backgroundColor: p.primarySoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    progressText: {
      fontWeight: '800',
      color: p.primary,
      fontSize: 14,
    },
    summaryBox: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    summaryText: {
      flex: 1,
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: p.borderLight,
    },
    stepRowActive: {
      backgroundColor: p.surfaceMuted,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
    },
    stepIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepIconDone: {
      backgroundColor: p.success,
    },
    stepIconPending: {
      backgroundColor: p.primarySoft,
      borderWidth: 1,
      borderColor: p.border,
    },
    stepNumber: {
      fontSize: 13,
      fontWeight: '800',
      color: p.primary,
    },
    stepBody: { flex: 1 },
    stepLabel: {
      ...typography.label,
      color: p.text,
    },
    stepLabelDone: {
      color: p.textMuted,
      textDecorationLine: 'line-through',
    },
    stepHint: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },
    footerNote: {
      ...typography.caption,
      color: p.textLight,
      marginTop: spacing.md,
      lineHeight: 18,
    },
  });
}
