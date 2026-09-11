import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DoctorAvatar } from '@/src/components/DoctorAvatar';
import {
  DOCTOR_REMINDER,
  formatNextDoctorReminder,
  getDoctorReminderCopy,
} from '@/src/constants/doctor-reminder';
import type { ReminderSettings } from '@/src/models/check-in';
import { REMINDER_FREQUENCY_OPTIONS } from '@/src/models/check-in';
import { fonts, radius, spacing, typography } from '@/src/theme';
import { cardShadow } from '@/src/theme/shadows';
import { useAppTheme } from '@/src/theme/useAppTheme';

interface DoctorReminderCardProps {
  firstName: string;
  reminderSettings: ReminderSettings;
}

export function DoctorReminderCard({ firstName, reminderSettings }: DoctorReminderCardProps) {
  const router = useRouter();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  const remindersOn =
    reminderSettings.remindersEnabled && reminderSettings.frequency !== 'disabled';
  const nextLabel = formatNextDoctorReminder(reminderSettings.nextReminderAt);
  const frequencyLabel =
    REMINDER_FREQUENCY_OPTIONS.find((o) => o.value === reminderSettings.frequency)?.label ??
    'Every 6 hours';
  const preview = getDoctorReminderCopy(firstName);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={isDark ? ['#0C4A6E', '#0369A1'] : ['#0284C7', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.head}>
          <DoctorAvatar size={52} />
          <View style={styles.headCopy}>
            <Text style={styles.eyebrow}>{DOCTOR_REMINDER.title}</Text>
            <Text style={styles.name}>{DOCTOR_REMINDER.name}</Text>
            <Text style={styles.tagline} numberOfLines={2}>
              {remindersOn
                ? 'Regular check-in — kamusta ang pakiramdam mo sa init?'
                : 'Turn on reminders for regular wellness check-ins'}
            </Text>
          </View>
          <View style={[styles.statusPill, !remindersOn && styles.statusPillOff]}>
            <View style={[styles.statusDot, remindersOn && styles.statusDotOn]} />
            <Text style={styles.statusText}>{remindersOn ? 'On' : 'Off'}</Text>
          </View>
        </View>

        {remindersOn ? (
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="alarm-outline" size={13} color="#FFFFFF" />
              <Text style={styles.metaText}>{frequencyLabel}</Text>
            </View>
            {nextLabel ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color="#FFFFFF" />
                <Text style={styles.metaText}>Next: {nextLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.preview} numberOfLines={2}>
          "{preview.body}"
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/check-in')}
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Check in now"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#0284C7" />
            <Text style={styles.btnPrimaryText}>Check in now</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/reminder-settings')}
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Reminder settings"
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.xxl,
      ...cardShadow(),
    },
    card: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.md,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    headCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: 'rgba(255,255,255,0.75)',
    },
    name: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    tagline: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      color: 'rgba(255,255,255,0.9)',
      marginTop: 2,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    statusPillOff: {
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    statusDotOn: {
      backgroundColor: '#86EFAC',
    },
    statusText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: '#FFFFFF',
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    metaText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: '#FFFFFF',
    },
    preview: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      color: 'rgba(255,255,255,0.85)',
      fontStyle: 'italic',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    btnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: '#FFFFFF',
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      minHeight: 44,
    },
    btnPrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: '#0284C7',
    },
    btnGhost: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.88 },
  });
}
