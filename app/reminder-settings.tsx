import { useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Switch, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { SurfaceCard } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import {
  REMINDER_FREQUENCY_OPTIONS,
  type ReminderFrequency,
  type ReminderSettings,
} from '@/src/models/check-in';
import { useResponsive } from '@/src/utils/responsive';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { spacing, radius, typography, fonts, cardShadow } from '@/src/theme';

const FREQUENCY_ICONS: Record<ReminderFrequency, React.ComponentProps<typeof Ionicons>['name']> = {
  every_2h: 'time-outline',
  every_4h: 'sunny-outline',
  every_6h: 'alarm-outline',
  every_12h: 'moon-outline',
  daily: 'calendar-outline',
  custom: 'options-outline',
  disabled: 'notifications-off-outline',
};

const FREQUENCY_CHOICES: ReminderFrequency[] = [
  'every_2h',
  'every_4h',
  'every_6h',
  'every_12h',
  'daily',
  'custom',
];

export default function ReminderSettingsScreen() {
  const router = useRouter();
  const { profile, reminderSettings, updateReminderSettings } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  const [settings, setSettings] = useState<ReminderSettings>(reminderSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return <Redirect href="/" />;

  const remindersOn = settings.remindersEnabled && settings.frequency !== 'disabled';

  const nextReminderLabel = reminderSettings.nextReminderAt
    ? new Date(reminderSettings.nextReminderAt).toLocaleString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const selectedFrequencyLabel =
    REMINDER_FREQUENCY_OPTIONS.find((o) => o.value === settings.frequency)?.label ?? 'Every 6 hours';

  function setFrequency(frequency: ReminderFrequency) {
    setSettings((s) => ({
      ...s,
      frequency,
      remindersEnabled: frequency !== 'disabled',
    }));
  }

  function toggleReminders(on: boolean) {
    setSettings((s) => ({
      ...s,
      remindersEnabled: on,
      frequency: on && s.frequency === 'disabled' ? 'every_6h' : s.frequency,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await updateReminderSettings(settings);
      setMessage('Reminder settings saved — alerts will appear in Notifications.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      overline="Reminders"
      title="Check-In Reminders"
      subtitle="Reminders appear on your phone notification shade and in the Notifications tab."
      back
      horizontalPadding={horizontalPadding}
    >
      {/* Hero schedule card */}
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="alarm" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroToggleWrap}>
            <Text style={styles.heroToggleLabel}>{remindersOn ? 'On' : 'Off'}</Text>
            <Switch
              value={remindersOn}
              onValueChange={toggleReminders}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: 'rgba(255,255,255,0.45)' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.25)"
            />
          </View>
        </View>

        {remindersOn ? (
          <>
            <Text style={styles.heroEyebrow}>Next check-in reminder</Text>
            <Text style={styles.heroTime}>{nextReminderLabel ?? 'After you save'}</Text>
            <Text style={styles.heroHint}>{selectedFrequencyLabel} · phone + in-app</Text>
          </>
        ) : (
          <>
            <Text style={styles.heroEyebrow}>Reminders paused</Text>
            <Text style={styles.heroTime}>Turn on to get safety check-ins</Text>
            <Text style={styles.heroHint}>You can still check in manually anytime</Text>
          </>
        )}
      </LinearGradient>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="notifications-outline" size={18} color={palette.primary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>Where reminders appear</Text>
            <Text style={styles.sectionSubtitle}>
              Allow notifications when prompted so check-in reminders and heat alerts reach your phone.
            </Text>
          </View>
        </View>
        <Button
          label="Open Notifications"
          onPress={() => router.push('/(tabs)/notifications')}
          variant="secondary"
        />
      </SurfaceCard>

      {/* Frequency */}
      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="repeat-outline" size={18} color={palette.primary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>How often?</Text>
            <Text style={styles.sectionSubtitle}>Choose a check-in rhythm that fits your day</Text>
          </View>
        </View>

        <View style={styles.freqGrid}>
          {FREQUENCY_CHOICES.map((value) => {
            const option = REMINDER_FREQUENCY_OPTIONS.find((o) => o.value === value)!;
            const active = settings.frequency === value && remindersOn;
            return (
              <Pressable
                key={value}
                onPress={() => setFrequency(value)}
                style={({ pressed }) => [
                  styles.freqChip,
                  active && styles.freqChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={FREQUENCY_ICONS[value]}
                  size={18}
                  color={active ? '#FFFFFF' : palette.primary}
                />
                <Text style={[styles.freqChipLabel, active && styles.freqChipLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {settings.frequency === 'custom' ? (
          <View style={styles.customWrap}>
            <Text style={styles.customLabel}>Custom interval (minutes)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(settings.customIntervalMinutes)}
              onChangeText={(v) =>
                setSettings((s) => ({
                  ...s,
                  customIntervalMinutes: Math.max(30, Number.parseInt(v, 10) || 30),
                }))
              }
              placeholder="360"
              placeholderTextColor={palette.textLight}
            />
            <Text style={styles.customHint}>Minimum 30 minutes</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => setFrequency('disabled')}
          style={({ pressed }) => [styles.disableRow, pressed && styles.pressed]}
        >
          <Ionicons
            name="notifications-off-outline"
            size={18}
            color={settings.frequency === 'disabled' ? palette.danger : palette.textMuted}
          />
          <Text
            style={[
              styles.disableLabel,
              settings.frequency === 'disabled' && { color: palette.danger },
            ]}
          >
            Turn off all reminders
          </Text>
        </Pressable>
      </SurfaceCard>

      {/* Quiet hours */}
      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.warningSoft }]}>
            <Ionicons name="moon-outline" size={18} color={palette.warning} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>Quiet hours</Text>
            <Text style={styles.sectionSubtitle}>No reminders while you rest</Text>
          </View>
          <Switch
            value={settings.quietHoursEnabled}
            onValueChange={(quietHoursEnabled) =>
              setSettings((s) => ({ ...s, quietHoursEnabled }))
            }
            trackColor={{ false: palette.border, true: palette.primarySoft }}
            thumbColor={settings.quietHoursEnabled ? palette.primary : palette.surface}
          />
        </View>

        {settings.quietHoursEnabled ? (
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>From</Text>
              <View style={styles.timeInputWrap}>
                <Ionicons name="bed-outline" size={16} color={palette.textMuted} />
                <TextInput
                  style={styles.timeInput}
                  value={settings.quietHoursStart}
                  onChangeText={(quietHoursStart) =>
                    setSettings((s) => ({ ...s, quietHoursStart }))
                  }
                  placeholder="22:00"
                  placeholderTextColor={palette.textLight}
                />
              </View>
            </View>
            <View style={styles.timeArrow}>
              <Ionicons name="arrow-forward" size={16} color={palette.textLight} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Until</Text>
              <View style={styles.timeInputWrap}>
                <Ionicons name="sunny-outline" size={16} color={palette.textMuted} />
                <TextInput
                  style={styles.timeInput}
                  value={settings.quietHoursEnd}
                  onChangeText={(quietHoursEnd) => setSettings((s) => ({ ...s, quietHoursEnd }))}
                  placeholder="07:00"
                  placeholderTextColor={palette.textLight}
                />
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.quietOffHint}>Quiet hours are off — reminders can arrive anytime.</Text>
        )}
      </SurfaceCard>

      {/* Heat alerts link */}
      <Pressable
        onPress={() => router.push('/(tabs)/notifications')}
        style={({ pressed }) => [styles.alertsLink, pressed && styles.pressed]}
      >
        <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="notifications-outline" size={18} color={palette.primary} />
        </View>
        <View style={styles.alertsLinkText}>
          <Text style={styles.alertsLinkTitle}>Heat & safety alerts</Text>
          <Text style={styles.alertsLinkSub}>View all in-app notifications</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      </Pressable>

      {message ? (
        <View
          style={[
            styles.feedback,
            message.includes('saved') || message.includes('working') || message.includes('scheduled')
              ? styles.feedbackSuccess
              : styles.feedbackError,
          ]}
        >
          <Ionicons
            name={
              message.includes('saved') || message.includes('working') || message.includes('scheduled')
                ? 'checkmark-circle'
                : 'alert-circle'
            }
            size={18}
            color={
              message.includes('saved') || message.includes('working') || message.includes('scheduled')
                ? palette.success
                : palette.danger
            }
          />
          <Text style={styles.feedbackText}>{message}</Text>
        </View>
      ) : null}

      <Button label={saving ? 'Saving…' : 'Save reminder settings'} onPress={handleSave} disabled={saving} />
    </Screen>
  );
}

function createStyles(palette: AppPalette, isDark: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    heroCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      ...shadow,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroToggleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroToggleLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
    },
    heroEyebrow: {
      ...typography.overline,
      color: 'rgba(255,255,255,0.75)',
      marginBottom: spacing.xs,
    },
    heroTime: {
      fontFamily: fonts.headerSemi,
      fontSize: 22,
      color: '#FFFFFF',
      marginBottom: spacing.xs,
    },
    heroHint: {
      ...typography.bodySm,
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 20,
    },
    expoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: palette.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? palette.border : 'rgba(37,99,235,0.15)',
    },
    expoNoteText: {
      ...typography.bodySm,
      color: palette.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    sectionCard: {
      marginBottom: spacing.md,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeadText: { flex: 1 },
    sectionTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: palette.textMuted,
      marginTop: 2,
    },
    freqGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    freqChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceInset,
      minWidth: '47%',
      flexGrow: 1,
    },
    freqChipActive: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    freqChipLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
      color: palette.text,
      flexShrink: 1,
    },
    freqChipLabelActive: {
      color: '#FFFFFF',
    },
    customWrap: {
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    customLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: palette.text,
    },
    customHint: {
      ...typography.caption,
      color: palette.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.md,
      padding: spacing.md,
      backgroundColor: palette.surfaceInset,
      color: palette.text,
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
    },
    disableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
    },
    disableLabel: {
      ...typography.bodySm,
      color: palette.textMuted,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    timeField: { flex: 1 },
    timeLabel: {
      ...typography.caption,
      color: palette.textMuted,
      marginBottom: spacing.xs,
      fontFamily: fonts.bodyMedium,
    },
    timeInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: palette.surfaceInset,
    },
    timeInput: {
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: palette.text,
      paddingVertical: spacing.xs,
    },
    timeArrow: {
      paddingBottom: spacing.md,
    },
    quietOffHint: {
      ...typography.bodySm,
      color: palette.textMuted,
      lineHeight: 20,
    },
    alertsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.md,
      marginBottom: spacing.lg,
      ...shadow,
    },
    alertsLinkText: { flex: 1 },
    alertsLinkTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: palette.text,
    },
    alertsLinkSub: {
      ...typography.caption,
      color: palette.textMuted,
      marginTop: 2,
    },
    feedback: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    feedbackSuccess: {
      backgroundColor: palette.successSoft,
    },
    feedbackError: {
      backgroundColor: palette.dangerSoft,
    },
    feedbackText: {
      ...typography.bodySm,
      color: palette.text,
      flex: 1,
    },
    pressed: { opacity: 0.88 },
  });
}
