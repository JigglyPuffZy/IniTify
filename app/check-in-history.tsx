import { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { EmptyState } from '@/src/components/ScreenContainer';
import { formatCheckInLine } from '@/src/components/CheckInForm';
import { getPhDateKey } from '@/src/utils/ph-date';
import { useResponsive } from '@/src/utils/responsive';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { spacing, radius, typography, cardShadow } from '@/src/theme';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function CheckInHistoryScreen() {
  const router = useRouter();
  const { profile, checkIns, lastCheckIn } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!profile) return <Redirect href="/" />;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof checkIns>();
    for (const item of checkIns) {
      const key = getPhDateKey(new Date(item.checkInTime));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [checkIns]);

  return (
    <Screen
      overline="History"
      title="Check-In History"
      subtitle={
        lastCheckIn
          ? `Last updated ${formatTime(lastCheckIn.checkInTime)}`
          : 'No check-ins yet — tap below to add one.'
      }
      back
      horizontalPadding={horizontalPadding}
      headerRight={
        <Pressable onPress={() => router.push('/check-in')}>
          <Ionicons name="add-circle-outline" size={26} color={palette.primary} />
        </Pressable>
      }
    >
      {checkIns.length === 0 ? (
        <EmptyState
          title="No check-ins yet"
          message="Save your first quick safety check to build a history."
          icon="time-outline"
          actionLabel="Check in now"
          onAction={() => router.push('/check-in')}
        />
      ) : (
        grouped.map(([day, items]) => (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayLabel}>{day === getPhDateKey(new Date()) ? 'Today' : day}</Text>
            {items.map((item) => {
              const lines = formatCheckInLine(item);
              return (
                <View key={item.id} style={[styles.card, cardShadow()]}>
                  <Text style={styles.time}>{formatTime(item.checkInTime)}</Text>
                  {lines.map((line) => (
                    <View key={line.text} style={styles.lineRow}>
                      <Ionicons name={line.icon} size={18} color={palette.primary} />
                      <Text style={styles.lineText}>{line.text}</Text>
                    </View>
                  ))}
                  {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                </View>
              );
            })}
          </View>
        ))
      )}
    </Screen>
  );
}

function createStyles(palette: { text: string; textMuted: string; surface: string; border: string }) {
  return StyleSheet.create({
    dayBlock: { marginBottom: spacing.lg, gap: spacing.sm },
    dayLabel: { ...typography.h3, color: palette.text, marginBottom: spacing.xs },
    card: {
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.md,
      gap: spacing.xs,
    },
    time: { fontWeight: '700', color: palette.text, marginBottom: spacing.xs },
    lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    lineText: { ...typography.body, color: palette.text },
    notes: { ...typography.bodySm, color: palette.textMuted, marginTop: spacing.xs, fontStyle: 'italic' },
  });
}
