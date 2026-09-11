import { useMemo, useState } from 'react';
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
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, riskLevelLabelFontSize, formatHeatIndexAssessmentLine } from '@/src/constants/risk-levels';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import {
  ScreenTopAccent,
} from '@/src/components/layout/PageMasthead';
import { ThemeModePicker } from '@/src/components/ThemeModePicker';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { ProfileAvatarPicker } from '@/src/components/ProfileAvatarPicker';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { resolveProfileAvatarId, type ProfileAvatarId } from '@/src/constants/profile-avatars';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import type { HeatRiskLevel } from '@/src/models/risk';
import { useRelativeTime } from '@/src/hooks/useRelativeTime';
import { useResponsive } from '@/src/utils/responsive';

const levelIcons: Record<HeatRiskLevel, React.ComponentProps<typeof Ionicons>['name']> = {
  LOW: 'shield-checkmark',
  MODERATE: 'alert-circle',
  HIGH: 'warning',
  EXTREME: 'flame',
  CRITICAL: 'skull',
};

const SETTINGS_LINKS: {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    title: 'Health profile',
    subtitle: 'Edit age, conditions & hydration',
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
    subtitle: 'In-app alerts',
    href: '/(tabs)/notifications',
    icon: 'notifications-outline',
  },
  {
    title: 'Offline guides',
    subtitle: 'Saved safety content',
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
  const { saveProfile } = useIniTify();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const assessedLabel = useRelativeTime(assessment?.assessedAt);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const selectedAvatarId = resolveProfileAvatarId(profile);

  async function handleAvatarChange(avatarId: ProfileAvatarId) {
    await saveProfile({ ...profile, avatarId });
  }

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

  const riskLevel = assessment?.level ?? null;
  const environmentalLevel = assessment?.environmentalLevel ?? riskLevel;
  const riskColor = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : palette.primary;
  const personalEscalated =
    environmentalLevel != null && riskLevel != null && environmentalLevel !== riskLevel;

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
  ];

  const checkInRows = [
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
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Profile</Text>
            <Text style={styles.pageSubtitle}>Your account & health info for Tify</Text>
          </View>

          <View style={styles.identityCard}>
            <LinearGradient
              colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityBanner}
            >
              <View style={styles.identityBannerRow}>
                <ProfileAvatar
                  name={profile.name}
                  avatarId={profile.avatarId}
                  size="md"
                  showEditBadge
                  onPress={() => setAvatarPickerOpen(true)}
                />
                <View style={styles.identityBannerText}>
                  <Text style={styles.identityNameOnBanner} numberOfLines={1}>{profile.name}</Text>
                  {user?.email ? (
                    <Text style={styles.identityEmailOnBanner} numberOfLines={1}>{user.email}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => router.push('/health-profile')}
                  style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit health profile"
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
              <View style={styles.identityLocationRow}>
                <Ionicons name="location-sharp" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.identityLocationOnBanner}>{TUGUEGARAO_STUDY_AREA.label}</Text>
                {usesSupabase ? (
                  <Text style={styles.identitySyncOnBanner}>· Synced</Text>
                ) : null}
              </View>
            </LinearGradient>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Heat risk</Text>
            <Text style={styles.sectionSubtitle}>From live weather</Text>
          </View>

          <Pressable
            onPress={() => router.push(riskLevel ? '/assessment' : '/(tabs)/home')}
            style={({ pressed }) => [
              styles.riskCard,
              riskLevel ? { borderColor: `${riskColor}55` } : null,
              pressed && styles.pressed,
            ]}
          >
            {riskLevel ? (
              <LinearGradient
                colors={isDark ? [`${riskColor}22`, 'transparent'] : [`${riskColor}12`, '#FFFFFF']}
                style={styles.riskCardInner}
              >
                <View style={styles.riskCardHead}>
                  <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                    <Ionicons name={levelIcons[riskLevel]} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.riskCardTitles}>
                    <Text style={styles.riskEyebrow}>
                      {personalEscalated ? 'Your health risk' : 'Your health risk'}
                    </Text>
                    <Text
                      style={[
                        styles.riskLevel,
                        {
                          color: riskColor,
                          fontSize: riskLevelLabelFontSize(
                            RISK_LEVEL_LABELS[riskLevel],
                            responsive.isCompact ? 18 : 22,
                          ),
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {RISK_LEVEL_LABELS[riskLevel]}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
                </View>
                <Text style={styles.riskMessage} numberOfLines={3}>
                  {assessment?.reason ??
                    formatHeatIndexAssessmentLine(
                      assessment?.inputs.heatIndex,
                      assessment?.level,
                    )}
                </Text>
                {assessment?.vulnerabilityScore != null ? (
                  <Text style={styles.riskVulnerability}>
                    Total vulnerability score: {assessment.vulnerabilityScore}
                  </Text>
                ) : null}
                {personalEscalated && environmentalLevel ? (
                  <Text style={styles.riskSubMeta}>
                    Outdoor level: {RISK_LEVEL_LABELS[environmentalLevel]}
                  </Text>
                ) : null}
                <Text style={styles.riskMeta}>Updated {assessedLabel}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.riskCardInner}>
                <View style={styles.riskEmpty}>
                  <View style={[styles.riskBadge, { backgroundColor: palette.primarySoft }]}>
                    <Ionicons name="thermometer-outline" size={20} color={palette.primary} />
                  </View>
                  <View style={styles.riskEmptyText}>
                    <Text style={styles.riskEmptyTitle}>No assessment yet</Text>
                    <Text style={styles.riskMessage}>
                      Open Home and refresh weather to see your heat level.
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={palette.primary} />
                </View>
              </View>
            )}
          </Pressable>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Risk factors</Text>
            <Text style={styles.sectionSubtitle}>
              Age, activity, hydration & health — used in your heat-risk assessment
            </Text>
          </View>

          <View style={styles.menuCard}>
            {healthRows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.menuRow, index < healthRows.length - 1 && styles.menuRowBorder]}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={row.icon} size={18} color={palette.primary} />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuLabel}>{row.label}</Text>
                  <Text style={styles.menuValue} numberOfLines={2}>{row.value}</Text>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => router.push('/health-profile')}
              style={({ pressed }) => [styles.menuEditRow, pressed && styles.pressed]}
            >
              <Ionicons name="pencil" size={16} color={palette.primary} />
              <Text style={styles.menuEditText}>Edit health profile</Text>
            </Pressable>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Tify check-in</Text>
            <Text style={styles.sectionSubtitle}>
              General status — for daily check-ins, not the decision tree
            </Text>
          </View>

          <View style={styles.menuCard}>
            {checkInRows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.menuRow, index < checkInRows.length - 1 && styles.menuRowBorder]}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={row.icon} size={18} color={palette.primary} />
                </View>
                <View style={styles.menuCopy}>
                  <Text style={styles.menuLabel}>{row.label}</Text>
                  <Text style={styles.menuValue} numberOfLines={2}>{row.value}</Text>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => router.push('/check-in')}
              style={({ pressed }) => [styles.menuEditRow, pressed && styles.pressed]}
            >
              <Ionicons name="pulse-outline" size={16} color={palette.primary} />
              <Text style={styles.menuEditText}>Check in with Tify</Text>
            </Pressable>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <View style={styles.menuCard}>
            <View style={styles.themePickerWrap}>
              <ThemeModePicker />
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Quick links</Text>
          </View>

          <View style={styles.menuCard}>
            {SETTINGS_LINKS.map((item, index) => (
              <SettingsMenuRow
                key={item.href}
                item={item}
                isLast={index === SETTINGS_LINKS.length - 1}
                styles={styles}
                palette={palette}
                onPress={() => router.push(item.href as never)}
              />
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

      <ProfileAvatarPicker
        visible={avatarPickerOpen}
        name={profile.name}
        selectedId={selectedAvatarId}
        onSelect={(id) => void handleAvatarChange(id)}
        onClose={() => setAvatarPickerOpen(false)}
      />
    </View>
  );
}

function SettingsMenuRow({
  item,
  isLast,
  styles,
  palette,
  onPress,
}: {
  item: (typeof SETTINGS_LINKS)[number];
  isLast: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        styles.menuRowPressable,
        !isLast && styles.menuRowBorder,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.menuIcon}>
        <Ionicons name={item.icon} size={18} color={palette.primary} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{item.title}</Text>
        <Text style={styles.menuValue} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
    </Pressable>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },

    pageHeader: {
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
      gap: 4,
    },
    pageTitle: {
      fontFamily: fonts.header,
      fontSize: 28,
      letterSpacing: -0.5,
      color: p.text,
    },
    pageSubtitle: {
      ...typography.bodySm,
      color: p.textMuted,
      lineHeight: 20,
    },

    identityCard: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadow,
    },
    identityBanner: {
      padding: layout.cardPaddingLg,
      gap: spacing.md,
    },
    identityBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    identityBannerText: { flex: 1, minWidth: 0 },
    identityNameOnBanner: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    identityEmailOnBanner: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    editBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    identityLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    identityLocationOnBanner: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.9)',
      fontFamily: fonts.bodyMedium,
    },
    identitySyncOnBanner: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.75)',
    },

    sectionBlock: {
      marginBottom: spacing.sm,
      gap: 2,
    },
    sectionTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 17,
    },

    riskCard: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: p.border,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    riskCardInner: {
      padding: layout.cardPaddingLg,
      gap: spacing.sm,
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
      letterSpacing: -0.5,
      lineHeight: 26,
    },
    riskMessage: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },
    riskVulnerability: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
      lineHeight: 18,
    },
    riskMeta: {
      ...typography.caption,
      color: p.textMuted,
    },
    riskSubMeta: {
      ...typography.caption,
      color: p.textSecondary,
      marginTop: 2,
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

    menuCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      marginBottom: spacing.xxl,
      ...shadow,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    menuRowPressable: {
      alignItems: 'center',
    },
    menuRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    menuCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    menuLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
    },
    menuValue: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 17,
    },
    menuEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.borderLight,
      backgroundColor: p.surfaceMuted,
    },
    menuEditText: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
    },
    themePickerWrap: {
      padding: spacing.lg,
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
