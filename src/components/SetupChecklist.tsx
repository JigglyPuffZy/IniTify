import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SetupChecklistItem, ItemStatus } from '@/src/models/setup-status';
import { radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const STATUS_LABELS: Record<ItemStatus, string> = {
  done: 'Done',
  in_progress: 'In progress',
  blocked: 'Blocked',
  needs_you: 'Action needed',
  optional: 'Optional',
};

interface SetupChecklistProps {
  items: SetupChecklistItem[];
  nextItem?: SetupChecklistItem | null;
  readyForAssessment: boolean;
}

export function SetupChecklist({
  items,
  nextItem,
  readyForAssessment,
}: SetupChecklistProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const statusColors: Record<ItemStatus, string> = {
    done: palette.primary,
    in_progress: palette.warning,
    blocked: palette.danger,
    needs_you: palette.warning,
    optional: palette.textMuted,
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Setup progress</Text>
      <View
        style={[
          styles.readyBanner,
          readyForAssessment ? styles.readyYes : styles.readyNo,
        ]}
      >
        <Ionicons
          name={readyForAssessment ? 'checkmark-circle' : 'alert-circle-outline'}
          size={18}
          color={readyForAssessment ? palette.primary : palette.warning}
        />
        <Text style={styles.readyText}>
          {readyForAssessment
            ? 'You are ready for a full risk assessment'
            : 'Complete the steps below to unlock full assessment'}
        </Text>
      </View>
      {nextItem ? (
        <View style={styles.nextBox}>
          <Text style={styles.nextLabel}>Next step</Text>
          <Text style={styles.nextTitle}>{nextItem.title}</Text>
          <Text style={styles.nextAction}>{nextItem.action}</Text>
        </View>
      ) : null}
      {items.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle}>{entry.title}</Text>
            <Text style={[styles.badge, { color: statusColors[entry.status] }]}>
              {STATUS_LABELS[entry.status]}
            </Text>
          </View>
          <Text style={styles.rowDetail}>{entry.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.lg,
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: p.borderLight,
      ...cardShadow(),
    },
    heading: {
      ...typography.h2,
      color: p.text,
      marginBottom: spacing.md,
    },
    readyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    readyYes: { backgroundColor: p.successSoft },
    readyNo: { backgroundColor: p.warningSoft },
    readyText: {
      flex: 1,
      ...typography.bodySm,
      fontWeight: '600',
      color: p.textSecondary,
    },
    nextBox: {
      backgroundColor: p.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderLeftWidth: 4,
      borderLeftColor: p.primary,
    },
    nextLabel: {
      ...typography.caption,
      color: p.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    nextTitle: {
      ...typography.h3,
      color: p.text,
      marginTop: 2,
    },
    nextAction: {
      ...typography.caption,
      color: p.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    row: {
      backgroundColor: p.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: p.borderLight,
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    rowTitle: {
      flex: 1,
      ...typography.label,
      color: p.text,
    },
    badge: {
      fontSize: 11,
      fontWeight: '700',
    },
    rowDetail: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 6,
      lineHeight: 18,
    },
  });
}
