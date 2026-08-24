import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@/src/models/user';
import type { RiskAssessmentResult } from '@/src/models/risk';
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import {
  ScreenTopAccent,
} from '@/src/components/layout/PageMasthead';
import { ThemeModePicker } from '@/src/components/ThemeModePicker';
import { useAuth } from '@/src/context/AuthContext';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import type { HeatRiskLevel } from '@/src/models/risk';

const levelIcons: Record<HeatRiskLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  LOW: 'shield-checkmark',
  MODERATE: 'alert-circle',
  HIGH: 'warning',
  EXTREME: 'flame',
};

const SHORTCUTS: {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    title: 'Health profile',
    subtitle: 'Conditions & check-ins',
    href: '/health-profile',
    icon: 'fitness-outline',
  },
  {
    title: 'Reminders',
    subtitle: 'Check-in schedule',
    href: '/reminder-settings',
    icon: 'alarm-outline',
  },
  {
    title: 'Notifications',
    subtitle: 'In-app alerts & reminders',
    href: '/(tabs)/notifications',
    icon: 'notifications-outline',
  },
  {
    title: 'Offline',
    subtitle: 'Saved guides',
    href: '/offline',
    icon: 'bookmark-outline',
  },
];

interface ProfileTabContentProps {
  profile: UserProfile;
  assessment: RiskAssessmentResult | null;
  horizontalPadding?: number;
}

export function ProfileTabContent({
  profile,
  assessment,
  horizontalPadding = layout.pagePadding,
}: ProfileTabContentProps) {
  const router = useRouter();
  const { user, signOut, usesSupabase } = useAuth();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  function handleSignOut() {
    Alert.alert('Sign out', 'You will need to sign in again to access your dashboard.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const { age, healthCondition, healthConditions, activityLevel, hydrationStatus, generalStatus } =
    profile.riskFactors;
  const initials = profile.name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const riskLevel = assessment?.level ?? null;
  const riskColor = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : palette.primary;

  const healthRows = [
    { icon: 'calendar-outline' as const, label: 'Age', value: age ? `${age} years` : 'Not set' },
    {
      icon: 'fitness-outline' as const,
      label: 'Activity level',
      value: activityLevel ?? 'Not set',
    },
    {
      icon: 'water-outline' as const,
      label: 'Hydration',
      value: hydrationStatus ?? 'Not set',
    },
    {
      icon: 'medical-outline' as const,
      label: 'Health condition',
      value:
        healthConditions?.filter((c) => c !== 'None').join(', ') ||
        healthCondition ||
        'None noted',
    },
    {
      icon: 'happy-outline' as const,
      label: 'General status',
      value: generalStatus ?? 'Not set',
    },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + 72 },
        ]}
      >
        <ScreenTopAccent />

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: horizontalPadding }}>
          <View style={styles.identityCard}>
            <LinearGradient
              colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityBanner}
            >
              <Text style={styles.identityOverline}>Your account</Text>
              <Pressable
                onPress={() => router.push('/health-profile')}
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              </Pressable>
            </LinearGradient>
            <View style={styles.identityBody}>
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>
              <View style={styles.identityText}>
                <Text style={styles.identityName}>{profile.name}</Text>
                {user?.email ? <Text style={styles.identityEmail}>{user.email}</Text> : null}
                {usesSupabase ? (
                  <Text style={styles.identitySync}>Profile synced to your account</Text>
                ) : null}
                <View style={styles.identityMeta}>
                  <Ionicons name="location-sharp" size={12} color={palette.primary} />
                  <Text style={styles.identityLocation}>{TUGUEGARAO_STUDY_AREA.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Risk status */}
          <Pressable
            onPress={() => router.push(riskLevel ? '/assessment' : '/(tabs)/home')}
            style={({ pressed }) => [
              styles.riskCard,
              { borderLeftColor: riskColor },
              pressed && styles.pressed,
            ]}
          >
            {riskLevel ? (
              <>
                <View style={styles.riskCardHead}>
                  <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
                    <Ionicons name={levelIcons[riskLevel]} size={20} color={riskColor} />
                  </View>
                  <View style={styles.riskCardTitles}>
                    <Text style={styles.riskEyebrow}>Current heat risk</Text>
                    <Text style={[styles.riskLevel, { color: riskColor }]}>
                      {RISK_LEVEL_LABELS[riskLevel]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
                </View>
                {assessment?.message ? (
                  <Text style={styles.riskMessage} numberOfLines={3}>
                    {assessment.message}
                  </Text>
                ) : (
                  <Text style={styles.riskMessage}>Based on your latest risk check.</Text>
                )}
              </>
            ) : (
              <View style={styles.riskEmpty}>
                <View style={[styles.riskBadge, { backgroundColor: palette.primarySoft }]}>
                  <Ionicons name="thermometer-outline" size={20} color={palette.primary} />
                </View>
                <View style={styles.riskEmptyText}>
                  <Text style={styles.riskEyebrow}>Heat risk</Text>
                  <Text style={styles.riskEmptyTitle}>No assessment yet</Text>
                  <Text style={styles.riskMessage}>Run a check from Home to see your level.</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={palette.primary} />
              </View>
            )}
          </Pressable>

          <SectionRule label="Health profile" styles={styles} />

          <View style={styles.listCard}>
            {healthRows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.healthRow, index < healthRows.length - 1 && styles.healthRowBorder]}
              >
                <View style={styles.healthIcon}>
                  <Ionicons name={row.icon} size={17} color={palette.primary} />
                </View>
                <Text style={styles.healthLabel}>{row.label}</Text>
                <Text style={styles.healthValue} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          <SectionRule label="Appearance" styles={styles} />
          <ThemeModePicker />

          <SectionRule label="Settings" styles={styles} />

          <View style={styles.shortcutGrid}>
            {SHORTCUTS.map((item) => (
              <ShortcutTile key={item.href} item={item} styles={styles} palette={palette} />
            ))}
          </View>

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutBtn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={18} color={palette.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={palette.textLight} />
            <Text style={styles.footerText}>IniTify · Heat safety for Tuguegarao City</Text>
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function SectionRule({
  label,
  styles,
}: {
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionRule}>
      <Text style={styles.sectionRuleLabel}>{label}</Text>
      <View style={styles.sectionRuleLine} />
    </View>
  );
}

function ShortcutTile({
  item,
  styles,
  palette,
}: {
  item: (typeof SHORTCUTS)[number];
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      style={({ pressed }) => [styles.shortcutTile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.shortcutIcon}>
        <Ionicons name={item.icon} size={20} color={palette.primary} />
      </View>
      <Text style={styles.shortcutTitle}>{item.title}</Text>
      <Text style={styles.shortcutSub} numberOfLines={1}>
        {item.subtitle}
      </Text>
    </Pressable>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },

    identityCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    identityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: layout.cardPaddingLg,
      paddingTop: spacing.lg,
      paddingBottom: 40,
      width: '100%',
    },
    identityOverline: {
      ...typography.overline,
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.2,
    },
    editBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    identityBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: layout.cardPaddingLg,
      marginTop: -28,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: p.surface,
      flexShrink: 0,
    },
    avatarText: {
      fontFamily: fonts.header,
      fontSize: 22,
      color: '#FFF',
    },
    identityText: { flex: 1, minWidth: 0, paddingTop: spacing.lg },
    identityName: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: p.text,
      letterSpacing: -0.3,
    },
    identityEmail: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },
    identitySync: {
      ...typography.caption,
      color: p.success,
      marginTop: 4,
      fontFamily: fonts.bodyMedium,
    },
    identityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    identityLocation: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
    },

    riskCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: layout.cardPaddingLg,
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      borderLeftWidth: 4,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    riskCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    riskBadge: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    riskCardTitles: { flex: 1, minWidth: 0 },
    riskEyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: p.textMuted,
      marginBottom: 2,
    },
    riskLevel: {
      fontFamily: fonts.header,
      fontSize: 24,
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    riskMessage: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },
    riskEmpty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    riskEmptyText: { flex: 1, minWidth: 0 },
    riskEmptyTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.text,
      marginBottom: 2,
    },

    sectionRule: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
      marginTop: spacing.sm,
    },
    sectionRuleLabel: {
      ...typography.overline,
      color: p.textMuted,
      flexShrink: 0,
    },
    sectionRuleLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
    },

    listCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      marginBottom: spacing.xxl,
      ...shadow,
    },
    healthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 56,
    },
    healthRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    healthIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    healthLabel: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.textSecondary,
      flex: 1,
    },
    healthValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
      textAlign: 'right',
      flexShrink: 1,
      maxWidth: '45%',
    },

    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    shortcutTile: {
      width: '48%',
      flexGrow: 1,
      minWidth: 140,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      minHeight: 108,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    shortcutIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    shortcutTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 14,
      color: p.text,
      letterSpacing: -0.15,
    },
    shortcutSub: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },

    signOutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      paddingVertical: spacing.lg,
      marginBottom: spacing.xl,
      ...shadow,
    },
    signOutText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.danger,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingBottom: spacing.md,
    },
    footerText: { ...typography.caption, color: p.textMuted },

    pressed: { opacity: 0.88 },
  });
}
