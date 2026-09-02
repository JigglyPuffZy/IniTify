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
import type { EmergencyState } from '@/src/models/emergency';
import { PageMasthead, ScreenTopAccent } from '@/src/components/layout/PageMasthead';
import { dialPhoneNumber } from '@/src/services/emergency/emergency-hotline.service';
import { emergencyContactService } from '@/src/services/emergency/emergency.service';
import { databaseService } from '@/src/services/database/database.service';
import { useIniTify } from '@/src/context/IniTifyContext';
import { EMERGENCY_HOTLINES, type EmergencyHotline } from '@/src/config/emergency.config';
import { getFirstAidGuidanceForProfile } from '@/src/constants/first-aid';
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

  const primaryHotline = EMERGENCY_HOTLINES[0];
  const firstAid = useMemo(() => getFirstAidGuidanceForProfile(profile), [profile]);

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
          <PageMasthead
            overline={TUGUEGARAO_STUDY_AREA.label}
            title="Emergency"
            subtitle="24/7 hotlines and heat first-aid guidance"
          />

          {emergencyState.isActive ? (
            <View style={styles.alertStrip}>
              <Ionicons name="alert-circle" size={18} color={palette.primary} />
              <Text style={styles.alertStripText}>
                Emergency active — call a hotline or follow first-aid steps below.
              </Text>
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
                colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sosHeroInner}>
                <View style={styles.sosOrb}>
                  {dialingId === primaryHotline.id ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Ionicons name="call" size={28} color="#FFF" />
                  )}
                </View>
                <View style={styles.sosHeroText}>
                  <Text style={styles.sosHeroEyebrow}>Fastest response</Text>
                  <Text style={styles.sosHeroTitle} numberOfLines={2}>
                    {primaryHotline.label}
                  </Text>
                  <Text style={styles.sosHeroPhone}>{primaryHotline.phone}</Text>
                  <Text style={styles.sosHeroHint}>Tap to dial now</Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
              </View>
            </Pressable>
          ) : null}

          {callResult ? <Text style={styles.callResult}>{callResult}</Text> : null}

          {emergencyContact?.phone ? (
            <View style={styles.contactActions}>
              <Pressable
                onPress={() =>
                  void handleDial({
                    id: 'personal',
                    label: emergencyContact.name,
                    phone: emergencyContact.phone,
                  })
                }
                style={({ pressed }) => [styles.contactActionBtn, styles.callContactBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Call emergency contact ${emergencyContact.name}`}
                disabled={dialingId === 'personal'}
              >
                {dialingId === 'personal' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="call" size={20} color="#FFF" />
                    <View style={styles.smsBtnTextWrap}>
                      <Text style={styles.callContactTitle}>Call {emergencyContact.name}</Text>
                      <Text style={styles.callContactSub}>Opens Phone dialer</Text>
                    </View>
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={() => void handleTextEmergencyContact()}
                style={({ pressed }) => [styles.contactActionBtn, styles.smsBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Text emergency contact ${emergencyContact.name}`}
                disabled={smsSending}
              >
                {smsSending ? (
                  <ActivityIndicator color={palette.primary} />
                ) : (
                  <>
                    <Ionicons name="chatbubble-ellipses" size={20} color={palette.primary} />
                    <View style={styles.smsBtnTextWrap}>
                      <Text style={styles.smsBtnTitle}>Text {emergencyContact.name}</Text>
                      <Text style={styles.smsBtnSub}>
                        Opens Messages — tap Send
                      </Text>
                    </View>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/setup')}
              style={({ pressed }) => [styles.smsBtn, styles.smsBtnSolo, pressed && styles.pressed]}
            >
              <Ionicons name="person-add-outline" size={20} color={palette.primary} />
              <View style={styles.smsBtnTextWrap}>
                <Text style={styles.smsBtnTitle}>Add emergency contact</Text>
                <Text style={styles.smsBtnSub}>Required to call or text your contact</Text>
              </View>
            </Pressable>
          )}

          <SectionRule label="Emergency hotlines" styles={styles} />

          <View style={styles.listCard}>
            {EMERGENCY_HOTLINES.map((hotline, index) => (
              <HotlineRow
                key={hotline.id}
                hotline={hotline}
                onPress={() => handleDial(hotline)}
                loading={dialingId === hotline.id}
                styles={styles}
                palette={palette}
                last={index === EMERGENCY_HOTLINES.length - 1 && !emergencyContact?.phone}
              />
            ))}
            {emergencyContact?.phone ? (
              <HotlineRow
                hotline={{
                  id: 'personal',
                  label: emergencyContact.name,
                  phone: emergencyContact.phone,
                  description: 'Your saved emergency contact',
                }}
                onPress={() =>
                  handleDial({
                    id: 'personal',
                    label: emergencyContact.name,
                    phone: emergencyContact.phone,
                  })
                }
                loading={dialingId === 'personal'}
                styles={styles}
                palette={palette}
                personal
                last
              />
            ) : null}
          </View>

          <SectionRule label="First aid" styles={styles} />

          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color={palette.primary} />
            <Text style={styles.noticeText}>{firstAid.notice}</Text>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsGroupLabel}>General heat first aid</Text>
            {firstAid.generalSections.map((section, index) => (
              <View
                key={section.heading}
                style={[
                  styles.stepRow,
                  index < firstAid.generalSections.length - 1 && styles.stepRowBorder,
                ]}
              >
                <View style={styles.stepDot}>
                  <Text style={styles.stepDotText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepHeading}>{section.heading}</Text>
                  <Text style={styles.stepBody}>{section.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {firstAid.conditionBlocks.map((block) => (
            <View key={block.conditionKey} style={styles.stepsCard}>
              <Text style={styles.stepsGroupLabel}>For {block.conditionLabel}</Text>
              {block.sections.map((section, index) => (
                <View
                  key={`${block.conditionKey}-${section.heading}`}
                  style={[
                    styles.stepRow,
                    index < block.sections.length - 1 && styles.stepRowBorder,
                  ]}
                >
                  <View style={styles.stepDot}>
                    <Text style={styles.stepDotText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepHeading}>{section.heading}</Text>
                    <Text style={styles.stepBody}>{section.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <SectionRule label="Resources" styles={styles} />

          <Pressable
            onPress={() => router.push('/hospital')}
            style={({ pressed }) => [styles.resourceTile, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.resourceIcon}>
              <Ionicons name="medkit-outline" size={22} color={palette.primary} />
            </View>
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>Find nearest hospital</Text>
              <Text style={styles.resourceSub}>Directions to major hospitals in Tuguegarao</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={palette.textLight} />
          </Pressable>
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

function HotlineRow({
  hotline,
  onPress,
  loading,
  styles,
  palette,
  personal,
  last,
}: {
  hotline: EmergencyHotline | { id: string; label: string; phone: string; description: string };
  onPress: () => void;
  loading?: boolean;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
  personal?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.hotlineRow, !last && styles.hotlineRowBorder]}>
      <View style={[styles.hotlineIcon, personal && styles.hotlineIconPersonal]}>
        <Ionicons
          name={personal ? 'person' : 'call-outline'}
          size={17}
          color={palette.primary}
        />
      </View>
      <View style={styles.hotlineText}>
        <Text style={styles.hotlineLabel} numberOfLines={2}>
          {hotline.label}
        </Text>
        <Text style={styles.hotlineDesc} numberOfLines={2}>
          {hotline.description}
        </Text>
        <Text style={styles.hotlinePhone}>{hotline.phone}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}
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

function createStyles(p: AppPalette, isDark: boolean, isCompact: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: p.background },
    scrollContent: { flexGrow: 1 },

    alertStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.18)',
    },
    alertStripText: {
      ...typography.bodySm,
      fontFamily: fonts.bodyMedium,
      color: p.primary,
      flex: 1,
    },

    sosHero: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.md,
      ...shadow,
    },
    sosHeroInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: isCompact ? spacing.lg : layout.cardPaddingLg,
    },
    sosOrb: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    sosHeroText: { flex: 1, minWidth: 0, gap: 2 },
    sosHeroEyebrow: {
      ...typography.overline,
      fontSize: 10,
      color: 'rgba(255,255,255,0.75)',
    },
    sosHeroTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: '#FFF',
      lineHeight: 22,
      letterSpacing: -0.2,
    },
    sosHeroPhone: {
      fontFamily: fonts.header,
      fontSize: 22,
      letterSpacing: -0.5,
      color: '#FFF',
      marginTop: 2,
    },
    sosHeroHint: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    callResult: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    contactActions: {
      gap: spacing.md,
      marginBottom: spacing.xxl,
    },
    contactActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 64,
      ...shadow,
    },
    callContactBtn: {
      backgroundColor: p.primary,
    },
    callContactTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    callContactSub: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    smsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: p.primary,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 64,
      ...shadow,
    },
    smsBtnSolo: {
      marginBottom: spacing.xxl,
    },
    smsBtnTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    smsBtnTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
    },
    smsBtnSub: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
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
    hotlineRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 72,
    },
    hotlineRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    hotlineIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    hotlineIconPersonal: { backgroundColor: p.surfaceInset },
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
      marginLeft: 'auto',
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

    stepsCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      paddingLeft: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    stepsGroupLabel: {
      ...typography.overline,
      color: p.primary,
      marginBottom: spacing.md,
      marginLeft: spacing.sm,
      letterSpacing: 1.2,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    stepRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.borderLight,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 2,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.3)' : 'rgba(37,99,235,0.15)',
    },
    stepDotText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.primary,
    },
    stepContent: { flex: 1, minWidth: 0 },
    stepHeading: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
      marginBottom: spacing.xs,
    },
    stepBody: {
      ...typography.bodySm,
      color: p.textSecondary,
      lineHeight: 20,
    },

    resourceTile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      marginBottom: spacing.lg,
      ...shadow,
    },
    resourceIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    resourceText: { flex: 1, minWidth: 0 },
    resourceTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 15,
      color: p.text,
    },
    resourceSub: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 3,
    },

    pressed: { opacity: 0.88 },
  });
}
