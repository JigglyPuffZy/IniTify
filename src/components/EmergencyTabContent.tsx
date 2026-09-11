import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { EmergencyContact, UserProfile } from '@/src/models/user';
import type { EmergencyIndicators, EmergencyState } from '@/src/models/emergency';
import { ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import { dialPhoneNumber } from '@/src/services/emergency/emergency-hotline.service';
import { emergencyContactService } from '@/src/services/emergency/emergency.service';
import { databaseService } from '@/src/services/database/database.service';
import { useIniTify } from '@/src/context/IniTifyContext';
import { EMERGENCY_HOTLINES, type EmergencyHotline } from '@/src/config/emergency.config';
import { getFirstAidGuidanceForProfile } from '@/src/constants/first-aid';
import { getFirstAidStepMeta } from '@/src/constants/first-aid-steps';
import { TUGUEGARAO_STUDY_AREA } from '@/src/constants/study-area';
import { layout, radius, spacing, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { useResponsive, useResponsiveTabBar } from '@/src/utils/responsive';

interface EmergencyTabContentProps {
  profile: UserProfile;
  emergencyContact: EmergencyContact | null;
  emergencyState: EmergencyState;
  horizontalPadding?: number;
}

function activeIndicatorLabels(indicators: EmergencyIndicators): string[] {
  const labels: string[] = [];
  if (indicators.extremeHeatRisk) labels.push('Extreme heat risk detected');
  if (indicators.repeatedFailedSafetyPrompts) labels.push('Missed safety check-ins');
  if (indicators.prolongedInactivity) labels.push('No recent activity');
  return labels;
}

export function EmergencyTabContent({
  profile,
  emergencyContact,
  emergencyState,
  horizontalPadding = layout.pagePadding,
}: EmergencyTabContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tab = useResponsiveTabBar();
  const { isCompact } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const { assessment, location } = useIniTify();
  const styles = useMemo(() => createStyles(palette, isDark, isCompact), [palette, isDark, isCompact]);
  const [callResult, setCallResult] = useState<string | null>(null);
  const [dialingId, setDialingId] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [expandedAid, setExpandedAid] = useState<Record<string, boolean>>({});

  const primaryHotline = EMERGENCY_HOTLINES[0];
  const firstAid = useMemo(() => getFirstAidGuidanceForProfile(profile), [profile]);
  const alertReasons = activeIndicatorLabels(emergencyState.indicators);

  async function handleDial(hotline: { id: string; label: string; phone: string }) {
    setDialingId(hotline.id);
    const result = await dialPhoneNumber(hotline.phone);
    setCallResult(result.message);
    if (result.status === 'success') {
      void databaseService.sync.syncHotlineCall(profile, {
        label: hotline.label,
        phone: hotline.phone,
      });
    }
    setDialingId(null);
  }

  async function handleTextEmergencyContact() {
    if (!emergencyContact?.phone || smsSending) return;
    setSmsSending(true);
    try {
      const result = await emergencyContactService.prepareNotification({
        userName: profile.name,
        heatRiskLevel: assessment?.level ?? null,
        lastKnownLocation: location,
        contact: emergencyContact,
        openSms: true,
      });
      setCallResult(result.smsMessage ?? result.error ?? 'SMS ready.');
      if (result.notification) {
        void databaseService.sync.syncContactNotification(
          profile,
          emergencyContact,
          result.notification,
          result.sent ? 'sent' : 'prepared',
        );
      }
    } finally {
      setSmsSending(false);
    }
  }

  function toggleAidBlock(key: string) {
    setExpandedAid((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing.huge + insets.bottom + tab.totalHeight },
        ]}
      >
        <ScreenTopAccent />

        <SafeAreaView edges={['top']} style={{ paddingHorizontal: horizontalPadding }}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Emergency</Text>
            <Text style={styles.pageSubtitle}>
              24/7 hotlines · heat first aid · {TUGUEGARAO_STUDY_AREA.label}
            </Text>
          </View>

          {emergencyState.isActive ? (
            <View style={styles.activeBanner}>
              <LinearGradient
                colors={isDark ? ['#7F1D1D', '#991B1B'] : ['#FEE2E2', '#FECACA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.activeBannerInner}>
                <View style={styles.activeBannerIcon}>
                  <Ionicons name="warning" size={22} color={isDark ? '#FCA5A5' : '#DC2626'} />
                </View>
                <View style={styles.activeBannerCopy}>
                  <Text style={styles.activeBannerTitle}>Emergency active</Text>
                  {alertReasons.map((reason) => (
                    <Text key={reason} style={styles.activeBannerReason}>· {reason}</Text>
                  ))}
                  <Text style={styles.activeBannerHint}>Call a hotline or follow first aid below.</Text>
                </View>
              </View>
            </View>
          ) : null}

          {primaryHotline ? (
            <Pressable
              onPress={() => handleDial(primaryHotline)}
              style={({ pressed }) => [styles.sosHero, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${primaryHotline.label}`}
            >
              <LinearGradient
                colors={isDark ? ['#991B1B', '#DC2626'] : ['#DC2626', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sosHeroInner}>
                <View style={styles.sosOrb}>
                  {dialingId === primaryHotline.id ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="call" size={30} color="#FFF" />
                  )}
                </View>
                <View style={styles.sosHeroText}>
                  <Text style={styles.sosHeroEyebrow}>Tap to call now</Text>
                  <Text style={styles.sosHeroTitle} numberOfLines={2}>
                    {primaryHotline.label}
                  </Text>
                  <Text style={styles.sosHeroPhone}>{primaryHotline.phone}</Text>
                  <Text style={styles.sosHeroHint}>City Command Center · 24/7</Text>
                </View>
                <View style={styles.sosChevron}>
                  <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.9)" />
                </View>
              </View>
            </Pressable>
          ) : null}

          {callResult ? (
            <View style={styles.feedbackBanner}>
              <Ionicons name="information-circle-outline" size={16} color={palette.textMuted} />
              <Text style={styles.feedbackText}>{callResult}</Text>
            </View>
          ) : null}

          <View style={styles.quickGrid}>
            <QuickActionTile
              icon="medkit"
              title="Nearest hospital"
              subtitle="Directions & contacts"
              onPress={() => router.push('/hospital')}
              styles={styles}
              accent={palette.primary}
            />
            <QuickActionTile
              icon="chatbubbles"
              title={emergencyContact?.phone ? 'Text contact' : 'Add contact'}
              subtitle={
                emergencyContact?.phone
                  ? emergencyContact.name
                  : 'For SMS alerts'
              }
              onPress={() =>
                emergencyContact?.phone
                  ? void handleTextEmergencyContact()
                  : router.push('/emergency-contact')
              }
              styles={styles}
              accent="#059669"
              loading={smsSending}
            />
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Your emergency contact</Text>
            <Text style={styles.sectionSubtitle}>
              Call or send a pre-filled SMS with your location
            </Text>
          </View>

          {emergencyContact?.phone ? (
            <View style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <LinearGradient
                  colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
                  style={styles.contactAvatar}
                >
                  <Ionicons name="person" size={22} color="#FFF" />
                </LinearGradient>
                <View style={styles.contactHeaderText}>
                  <Text style={styles.contactName}>{emergencyContact.name}</Text>
                  <Text style={styles.contactPhone}>{emergencyContact.phone}</Text>
                </View>
              </View>
              <View style={styles.contactActions}>
                <Pressable
                  onPress={() =>
                    void handleDial({
                      id: 'personal',
                      label: emergencyContact.name,
                      phone: emergencyContact.phone,
                    })
                  }
                  style={({ pressed }) => [styles.contactBtn, styles.contactBtnCall, pressed && styles.pressed]}
                  disabled={dialingId === 'personal'}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${emergencyContact.name}`}
                >
                  {dialingId === 'personal' ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="call" size={18} color="#FFF" />
                      <Text style={styles.contactBtnCallText}>Call</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => void handleTextEmergencyContact()}
                  style={({ pressed }) => [styles.contactBtn, styles.contactBtnText, pressed && styles.pressed]}
                  disabled={smsSending}
                  accessibilityRole="button"
                  accessibilityLabel={`Text ${emergencyContact.name}`}
                >
                  {smsSending ? (
                    <ActivityIndicator color={palette.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="chatbubble-ellipses" size={18} color={palette.primary} />
                      <Text style={styles.contactBtnTextLabel}>Text</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Text style={styles.contactHint}>Text opens Messages — tap Send to deliver.</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/emergency-contact')}
              style={({ pressed }) => [styles.addContactCard, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <View style={styles.addContactIcon}>
                <Ionicons name="person-add" size={22} color={palette.primary} />
              </View>
              <View style={styles.addContactCopy}>
                <Text style={styles.addContactTitle}>Add emergency contact</Text>
                <Text style={styles.addContactSub}>
                  Save someone who can be called or texted in a heat emergency
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textLight} />
            </Pressable>
          )}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>All hotlines</Text>
            <Text style={styles.sectionSubtitle}>Tuguegarao City — tap Call on any row</Text>
          </View>

          <View style={styles.menuCard}>
            {EMERGENCY_HOTLINES.map((hotline, index) => (
              <HotlineRow
                key={hotline.id}
                hotline={hotline}
                onPress={() => handleDial(hotline)}
                loading={dialingId === hotline.id}
                styles={styles}
                palette={palette}
                isLast={index === EMERGENCY_HOTLINES.length - 1}
                highlight={hotline.id === primaryHotline?.id}
              />
            ))}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Heat first aid</Text>
            <Text style={styles.sectionSubtitle}>Decision support only — not a substitute for medical care</Text>
          </View>

          <View style={styles.noticeCard}>
            <Ionicons name="shield-checkmark-outline" size={20} color={palette.primary} />
            <Text style={styles.noticeText}>{firstAid.notice}</Text>
          </View>

          <View style={styles.firstAidHero}>
            <LinearGradient
              colors={isDark ? ['#14532D', '#166534'] : ['#DCFCE7', '#BBF7D0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.firstAidHeroInner}>
              <View style={styles.firstAidHeroIcon}>
                <Ionicons name="list-outline" size={22} color={isDark ? '#86EFAC' : '#15803D'} />
              </View>
              <View style={styles.firstAidHeroCopy}>
                <Text style={styles.firstAidHeroTitle}>General steps</Text>
                <Text style={styles.firstAidHeroSub}>Follow in order · stay calm</Text>
              </View>
            </View>
          </View>

          <View style={styles.stepsList}>
            {firstAid.generalSections.map((section, index) => (
              <FirstAidStep
                key={section.heading}
                step={index + 1}
                heading={section.heading}
                body={section.body}
                isLast={index === firstAid.generalSections.length - 1}
                styles={styles}
                palette={palette}
                isDark={isDark}
              />
            ))}
          </View>

          {firstAid.conditionBlocks.map((block) => {
            const key = block.conditionKey;
            const expanded = expandedAid[key] ?? false;
            return (
              <View key={key} style={styles.conditionCard}>
                <Pressable
                  onPress={() => toggleAidBlock(key)}
                  style={({ pressed }) => [styles.aidAccordionHead, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                >
                  <View style={styles.aidAccordionIcon}>
                    <Ionicons name="heart-outline" size={18} color={palette.primary} />
                  </View>
                  <View style={styles.aidAccordionCopy}>
                    <Text style={styles.aidAccordionTitle}>For {block.conditionLabel}</Text>
                    <Text style={styles.aidAccordionSub}>
                      {expanded ? 'Tap to collapse' : `${block.sections.length} extra steps`}
                    </Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={palette.textLight}
                  />
                </Pressable>
                {expanded
                  ? block.sections.map((section, index) => (
                      <FirstAidStep
                        key={`${key}-${section.heading}`}
                        step={index + 1}
                        heading={section.heading}
                        body={section.body}
                        isLast={index === block.sections.length - 1}
                        styles={styles}
                        palette={palette}
                        isDark={isDark}
                        nested
                      />
                    ))
                  : null}
              </View>
            );
          })}

          <View style={styles.footer}>
            <Ionicons name="alert-circle-outline" size={14} color={palette.textLight} />
            <Text style={styles.footerText}>
              In a life-threatening emergency, call the hotline above immediately.
            </Text>
          </View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function QuickActionTile({
  icon,
  title,
  subtitle,
  onPress,
  styles,
  accent,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.quickTileIcon, { backgroundColor: `${accent}18` }]}>
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : (
          <Ionicons name={icon} size={22} color={accent} />
        )}
      </View>
      <Text style={styles.quickTileTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.quickTileSub} numberOfLines={1}>{subtitle}</Text>
    </Pressable>
  );
}

function HotlineRow({
  hotline,
  onPress,
  loading,
  styles,
  palette,
  isLast,
  highlight,
}: {
  hotline: EmergencyHotline;
  onPress: () => void;
  loading?: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  isLast?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.hotlineRow, !isLast && styles.hotlineRowBorder]}>
      <View style={[styles.hotlineIcon, highlight && styles.hotlineIconHighlight]}>
        <Ionicons
          name={highlight ? 'call' : 'call-outline'}
          size={18}
          color={highlight ? '#DC2626' : palette.primary}
        />
      </View>
      <View style={styles.hotlineText}>
        <Text style={styles.hotlineLabel} numberOfLines={2}>{hotline.label}</Text>
        <Text style={styles.hotlineDesc} numberOfLines={2}>{hotline.description}</Text>
        <Text style={styles.hotlinePhone}>{hotline.phone}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.callBtn,
          highlight && styles.callBtnHighlight,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Call ${hotline.label}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callBtnText}>Call</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function FirstAidStep({
  step,
  heading,
  body,
  isLast,
  styles,
  isDark,
  nested,
}: {
  step: number;
  heading: string;
  body: string;
  isLast: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  isDark: boolean;
  nested?: boolean;
}) {
  const meta = getFirstAidStepMeta(heading);

  return (
    <View style={[styles.stepCard, nested && styles.stepCardNested, !isLast && styles.stepCardGap]}>
      <View style={[styles.stepIconWrap, { backgroundColor: isDark ? `${meta.color}22` : meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={styles.stepCardBody}>
        <View style={styles.stepCardHead}>
          <View style={[styles.stepBadge, { backgroundColor: meta.color }]}>
            <Text style={styles.stepBadgeText}>Step {step}</Text>
          </View>
        </View>
        <Text style={styles.stepHeading}>{heading}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, isCompact: boolean) {
  const shadow = cardShadow();
  const dangerSoft = isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2';
  const dangerBorder = isDark ? 'rgba(248,113,113,0.35)' : '#FECACA';

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

    activeBanner: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: dangerBorder,
      ...shadow,
    },
    activeBannerInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.lg,
    },
    activeBannerIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    activeBannerCopy: { flex: 1, minWidth: 0, gap: 2 },
    activeBannerTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: isDark ? '#FECACA' : '#991B1B',
      marginBottom: 2,
    },
    activeBannerReason: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: isDark ? '#FCA5A5' : '#B91C1C',
      lineHeight: 17,
    },
    activeBannerHint: {
      ...typography.caption,
      color: isDark ? 'rgba(254,202,202,0.85)' : '#7F1D1D',
      marginTop: spacing.xs,
      lineHeight: 17,
    },

    sosHero: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(248,113,113,0.4)' : 'rgba(220,38,38,0.25)',
      ...shadow,
    },
    sosHeroInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: isCompact ? spacing.lg : layout.cardPaddingLg,
    },
    sosOrb: {
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sosHeroText: { flex: 1, minWidth: 0, gap: 2 },
    sosHeroEyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
      letterSpacing: 1,
    },
    sosHeroTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: isCompact ? 15 : 17,
      color: '#FFF',
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    sosHeroPhone: {
      fontFamily: fonts.header,
      fontSize: isCompact ? 24 : 28,
      letterSpacing: -0.5,
      color: '#FFF',
      marginTop: 2,
    },
    sosHeroHint: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    sosChevron: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },

    feedbackBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: p.surfaceMuted,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    feedbackText: {
      ...typography.caption,
      color: p.textMuted,
      flex: 1,
    },

    quickGrid: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xxl,
    },
    quickTile: {
      flex: 1,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      gap: spacing.sm,
      minHeight: 108,
      ...shadow,
    },
    quickTileIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickTileTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 14,
      color: p.text,
      letterSpacing: -0.15,
    },
    quickTileSub: {
      ...typography.caption,
      color: p.textMuted,
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

    contactCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.lg,
      marginBottom: spacing.xxl,
      gap: spacing.md,
      ...shadow,
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    contactAvatar: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    contactHeaderText: { flex: 1, minWidth: 0 },
    contactName: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.text,
    },
    contactPhone: {
      ...typography.bodySm,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
      marginTop: 2,
    },
    contactActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    contactBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      minHeight: 48,
    },
    contactBtnCall: {
      backgroundColor: p.primary,
    },
    contactBtnCallText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFF',
    },
    contactBtnText: {
      backgroundColor: p.primarySoft,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.18)',
    },
    contactBtnTextLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.primary,
    },
    contactHint: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
    },

    addContactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: p.primary,
      borderStyle: 'dashed',
      padding: spacing.lg,
      marginBottom: spacing.xxl,
      ...shadow,
    },
    addContactIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    addContactCopy: { flex: 1, minWidth: 0 },
    addContactTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
    },
    addContactSub: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
      lineHeight: 17,
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
    hotlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 76,
    },
    hotlineRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    hotlineIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    hotlineIconHighlight: {
      backgroundColor: dangerSoft,
    },
    hotlineText: { flex: 1, minWidth: 0 },
    hotlineLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
      lineHeight: 18,
    },
    hotlineDesc: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    hotlinePhone: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.primary,
      marginTop: 4,
    },
    callBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: p.primary,
      paddingVertical: 9,
      paddingHorizontal: isCompact ? spacing.sm : spacing.md,
      borderRadius: radius.md,
      minWidth: isCompact ? 64 : 72,
      flexShrink: 0,
    },
    callBtnHighlight: {
      backgroundColor: '#DC2626',
    },
    callBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: '#FFFFFF',
    },

    noticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
    },
    noticeText: {
      ...typography.caption,
      color: p.textSecondary,
      flex: 1,
      lineHeight: 18,
    },

    conditionCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      overflow: 'hidden',
      ...shadow,
    },
    firstAidHero: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(74,222,128,0.25)' : '#86EFAC',
      ...shadow,
    },
    firstAidHeroInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    firstAidHeroIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    firstAidHeroCopy: { flex: 1, minWidth: 0, gap: 2 },
    firstAidHeroTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: isDark ? '#DCFCE7' : '#14532D',
    },
    firstAidHeroSub: {
      ...typography.caption,
      color: isDark ? '#86EFAC' : '#166534',
    },

    stepsList: {
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    stepCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    stepCardNested: {
      marginTop: spacing.sm,
    },
    stepCardGap: {
      marginBottom: 0,
    },
    stepIconWrap: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepCardBody: { flex: 1, minWidth: 0, gap: spacing.xs },
    stepCardHead: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    stepBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: '#FFFFFF',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    stepHeading: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: p.text,
      lineHeight: 21,
    },
    stepBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 21,
    },

    aidAccordionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    aidAccordionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    aidAccordionCopy: { flex: 1, minWidth: 0 },
    aidAccordionTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
    },
    aidAccordionSub: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    footerText: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      flex: 1,
      lineHeight: 17,
    },

    pressed: { opacity: 0.88 },
  });
}
