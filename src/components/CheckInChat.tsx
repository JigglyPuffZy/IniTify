import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { UserProfile } from '@/src/models/user';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { UserLocation } from '@/src/models/location';
import type { CheckInChatDraft, CheckInChatMessage, CheckInChatStep } from '@/src/models/check-in-chat';
import { checkInChatService } from '@/src/services/check-in/check-in-chat.service';
import { hospitalService, type HospitalInfo } from '@/src/services/hospital/hospital.service';
import { RISK_LEVEL_LABELS } from '@/src/constants/risk-levels';
import { BrandMark } from '@/src/components/auth/BrandMark';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { cardShadow, fonts, layout, radius, spacing, typography } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';
import { getHeroGradient } from '@/src/theme/palettes';

const ASSISTANT_NAME = 'Tify';

const CHECK_IN_STEPS: { key: CheckInChatStep; label: string }[] = [
  { key: 'hydration', label: 'Hydration' },
  { key: 'activity', label: 'Activity' },
  { key: 'feeling', label: 'How you feel' },
];

function stepIndex(step: CheckInChatStep): number {
  if (step === 'greeting' || step === 'hydration') return 0;
  if (step === 'activity') return 1;
  if (step === 'feeling' || step === 'notes' || step === 'confirm' || step === 'done') return 2;
  return 0;
}

function normalizeQuickReply(text: string): string {
  const map: Record<string, string> = {
    'Well hydrated': 'Well Hydrated',
    'Well Hydrated': 'Well Hydrated',
    'Needs water': 'Needs Hydration',
    'Needs Hydration': 'Needs Hydration',
    Dehydrated: 'Dehydrated / Concerning',
    'Dehydrated / Concerning': 'Dehydrated / Concerning',
  };
  return map[text] ?? text;
}

function chipDisplayLabel(reply: string): string {
  if (reply === 'Dehydrated / Concerning') return 'Dehydrated';
  if (reply === 'Needs Hydration') return 'Needs water';
  if (reply === 'Well Hydrated') return 'Well hydrated';
  return reply;
}

interface CheckInChatProps {
  profile: UserProfile;
  heatIndexC: number | null;
  riskLevel: HeatRiskLevel | null;
  location?: UserLocation | null;
  onRequestLocation?: () => Promise<void>;
  onSave: (input: {
    hydrationStatus: string;
    activityLevel: string;
    generalStatus: string;
    notes?: string;
    chatMessages: CheckInChatMessage[];
  }) => Promise<void>;
  onClose?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function TifyAvatar({ size = 36, ring = false }: { size?: number; ring?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View style={[tifyAvatarStyles.ring, ring && tifyAvatarStyles.ringActive]}>
      <View
        style={[
          tifyAvatarStyles.shell,
          { borderRadius: radius.md, backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <BrandMark size={size} />
      </View>
    </View>
  );
}

const tifyAvatarStyles = StyleSheet.create({
  ring: {
    borderRadius: radius.lg,
    padding: 2,
  },
  ringActive: {
    backgroundColor: 'rgba(37,99,235,0.18)',
  },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderWidth: 1,
  },
});

function buildContextLine(heatIndexC: number | null, riskLevel: HeatRiskLevel | null): string | null {
  const parts: string[] = [];
  if (heatIndexC != null) {
    parts.push(`${(Math.round(heatIndexC * 10) / 10).toFixed(1)}°C heat index`);
  }
  if (riskLevel) parts.push(`${RISK_LEVEL_LABELS[riskLevel]} risk`);
  return parts.length ? parts.join(' · ') : null;
}

interface CheckInHeaderProps {
  styles: ReturnType<typeof createStyles>;
  shadow: ReturnType<typeof cardShadow>;
  firstName: string;
  usesAi: boolean;
  heatIndexC: number | null;
  riskLevel: HeatRiskLevel | null;
  activeStep: number;
  draftStep: CheckInChatStep;
  onClose?: () => void;
  compact?: boolean;
}

function CheckInHeader({
  styles,
  shadow,
  firstName,
  usesAi,
  heatIndexC,
  riskLevel,
  activeStep,
  draftStep,
  onClose,
  compact = false,
}: CheckInHeaderProps) {
  const contextLine = buildContextLine(heatIndexC, riskLevel);

  return (
    <View style={[styles.header, shadow, compact && styles.headerCompact]}>
      <View style={[styles.headerBar, compact && styles.headerBarCompact]}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}

        <View style={styles.headerBrand}>
          <TifyAvatar size={compact ? 28 : 32} ring />
          <View style={styles.headerBrandText}>
            <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
            {!compact ? (
              <Text style={styles.headerTagline}>
                {usesAi ? 'Personal heat guidance' : 'Guided check-in'}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.backBtnSpacer} />
      </View>

      {!compact ? (
        <>
          <Text style={styles.greetingText}>
            Hi {firstName}, how are you feeling in the heat today?
          </Text>
          {contextLine ? <Text style={styles.contextMeta}>{contextLine}</Text> : null}
          <Text style={styles.disclaimerText}>Guidance only — not a medical diagnosis.</Text>

          {!usesAi && draftStep !== 'done' ? (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={['#1D4ED8', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${((activeStep + 1) / CHECK_IN_STEPS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressCaption}>
                Step {activeStep + 1} of {CHECK_IN_STEPS.length} · {CHECK_IN_STEPS[activeStep]?.label}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function CheckInChat({
  profile,
  heatIndexC,
  riskLevel,
  location = null,
  onRequestLocation,
  onSave,
  onClose,
}: CheckInChatProps) {
  const { palette, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 360;
  const pagePad = isCompact ? 16 : layout.pagePadding;
  const styles = useMemo(
    () => createStyles(palette, isDark, pagePad),
    [palette, isDark, pagePad],
  );
  const listRef = useRef<FlatList<CheckInChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const shadow = useMemo(() => cardShadow(), []);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [messages, setMessages] = useState<CheckInChatMessage[]>([]);
  const [draft, setDraft] = useState<CheckInChatDraft>({ step: 'greeting' });
  const [quickReplies, setQuickReplies] = useState<string[] | undefined>();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [readyToSave, setReadyToSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usesAi, setUsesAi] = useState(false);
  const [showHospitalCta, setShowHospitalCta] = useState(false);
  const [nearestHospital, setNearestHospital] = useState<HospitalInfo | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [hospitalStatus, setHospitalStatus] = useState<string | null>(null);
  const [openingMaps, setOpeningMaps] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const firstName = useMemo(() => profile.name.split(' ')[0] || profile.name, [profile.name]);
  const activeStep = stepIndex(draft.step);
  const canSend = Boolean(input.trim()) && !typing && !saving;
  const greetingHeatSynced = useRef(false);

  useEffect(() => {
    greetingHeatSynced.current = false;
    const start = checkInChatService.startConversation(profile, heatIndexC);
    setMessages(start.messages);
    setDraft(start.draft);
    setUsesAi(checkInChatService.isAiConfigured());
    setQuickReplies(checkInChatService.getStarterQuickReplies());
  }, [profile]);

  // After live weather refresh, rewrite only the starter greeting so Tify matches Weather tab
  useEffect(() => {
    if (heatIndexC == null || greetingHeatSynced.current) return;
    if (messages.length !== 1 || messages[0]?.role !== 'assistant') return;
    const start = checkInChatService.startConversation(profile, heatIndexC);
    setMessages(start.messages);
    greetingHeatSynced.current = true;
  }, [heatIndexC, profile, messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, typing, showHospitalCta, scrollToEnd]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      // Android tabs + pan: lift the chat by the real keyboard height so the composer stays visible.
      setKeyboardHeight(Platform.OS === 'android' ? e.endCoordinates.height : 0);
      scrollToEnd();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToEnd]);

  useEffect(() => {
    if (!showHospitalCta || !location) {
      if (showHospitalCta && !location) {
        setNearestHospital(null);
        setHospitalStatus('Turn on location to find the nearest hospital.');
      }
      return;
    }

    let cancelled = false;
    setHospitalLoading(true);
    setHospitalStatus(null);

    void hospitalService.findNearest(location).then((result) => {
      if (cancelled) return;
      setHospitalLoading(false);
      if (result.status === 'success' && result.data) {
        setNearestHospital(result.data);
        setHospitalStatus(null);
      } else {
        setNearestHospital(null);
        setHospitalStatus(result.message || 'Could not find a nearby hospital.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showHospitalCta, location]);

  const handleRequestLocation = useCallback(async () => {
    if (!onRequestLocation || requestingLocation) return;
    setRequestingLocation(true);
    try {
      await onRequestLocation();
    } finally {
      setRequestingLocation(false);
    }
  }, [onRequestLocation, requestingLocation]);

  const handleOpenNearestHospital = useCallback(async () => {
    if (!location || !nearestHospital || openingMaps) return;
    setOpeningMaps(true);
    try {
      const result = await hospitalService.openNavigation(nearestHospital, location);
      if (result.status !== 'success') {
        setHospitalStatus(result.message || 'Could not open maps.');
      }
    } finally {
      setOpeningMaps(false);
    }
  }, [location, nearestHospital, openingMaps]);

  const saveCheckIn = useCallback(
    async (saveDraft: CheckInChatDraft, transcript: CheckInChatMessage[]) => {
      if (!saveDraft.hydrationStatus || !saveDraft.activityLevel || !saveDraft.generalStatus) {
        return;
      }
      setSaving(true);
      try {
        await onSave({
          hydrationStatus: saveDraft.hydrationStatus,
          activityLevel: saveDraft.activityLevel,
          generalStatus: saveDraft.generalStatus,
          notes: saveDraft.notes,
          chatMessages: transcript,
        });
      } finally {
        setSaving(false);
      }
    },
    [onSave],
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = normalizeQuickReply(text.trim());
      if (!trimmed || typing || saving) return;

      setInput('');
      setQuickReplies(undefined);
      setTyping(true);

      const userMessage: CheckInChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      try {
        const result = await checkInChatService.sendUserMessage({
          profile,
          heatIndexC,
          riskLevel,
          draft,
          messages: nextMessages,
          userText: trimmed,
        });

        const fullTranscript = [...nextMessages, result.assistantMessage];
        setMessages(fullTranscript);
        setDraft(result.draft);
        setQuickReplies(result.quickReplies);
        setReadyToSave(result.readyToSave);
        setUsesAi(result.usesAi);
        if (result.showHospitalCta) setShowHospitalCta(true);

        if (
          result.readyToSave &&
          result.draft.hydrationStatus &&
          result.draft.activityLevel &&
          result.draft.generalStatus &&
          !result.usesAi
        ) {
          await saveCheckIn(result.draft, fullTranscript);
        }
      } finally {
        setTyping(false);
      }
    },
    [typing, saving, profile, heatIndexC, riskLevel, draft, messages, saveCheckIn],
  );

  const renderMessage = ({ item, index }: { item: CheckInChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const showAvatar = !isUser && (index === 0 || messages[index - 1]?.role !== 'assistant');

    return (
      <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
        <View style={[styles.row, isUser && styles.rowUser]}>
          {!isUser ? (
            showAvatar ? <TifyAvatar size={32} /> : <View style={styles.avatarSpacer} />
          ) : null}
          <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
            {isUser ? (
              <LinearGradient
                colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleUser]}
              >
                <Text style={styles.bubbleTextUser}>{item.content}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleAssistant, shadow]}>
                <Text style={styles.bubbleText}>{item.content}</Text>
              </View>
            )}
            <Text style={[styles.time, isUser && styles.timeUser]}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : null]}>
      <LinearGradient
        colors={getHeroGradient(isDark, riskLevel)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ambientGlow} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
        enabled={Platform.OS === 'ios'}
      >
        <CheckInHeader
          styles={styles}
          shadow={shadow}
          firstName={firstName}
          usesAi={usesAi}
          heatIndexC={heatIndexC}
          riskLevel={riskLevel}
          activeStep={activeStep}
          draftStep={draft.step}
          onClose={onClose}
          compact={keyboardVisible}
        />

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={scrollToEnd}
          ListFooterComponent={
            typing ? (
              <View style={styles.messageBlock}>
                <View style={styles.row}>
                  <TifyAvatar size={32} />
                  <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble, shadow]}>
                    <View style={styles.typingDots}>
                      <View style={styles.dot} />
                      <View style={[styles.dot, styles.dotMid]} />
                      <View style={[styles.dot, styles.dotLate]} />
                    </View>
                    <Text style={styles.typingText}>Tify is typing…</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.footer,
            shadow,
            {
              paddingBottom: keyboardVisible
                ? spacing.xs
                : Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {quickReplies?.length && !keyboardVisible ? (
            <View style={styles.quickRepliesWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.quickReplies}
              >
                {quickReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                    onPress={() => void handleSend(reply)}
                    disabled={typing || saving}
                  >
                    <Text style={styles.chipText} numberOfLines={1}>
                      {chipDisplayLabel(reply)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {showHospitalCta && !keyboardVisible ? (
            <View style={styles.hospitalCtaWrap}>
              <Text style={styles.hospitalCtaHint}>Nearest hospital</Text>
              {!location ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.hospitalCta,
                    styles.hospitalCtaMuted,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => void handleRequestLocation()}
                  disabled={requestingLocation || !onRequestLocation}
                  accessibilityRole="button"
                  accessibilityLabel="Enable location for nearest hospital"
                >
                  {requestingLocation ? (
                    <ActivityIndicator color={palette.primary} />
                  ) : (
                    <Text style={styles.hospitalCtaTitle}>Enable location</Text>
                  )}
                </Pressable>
              ) : hospitalLoading ? (
                <View style={[styles.hospitalCta, styles.hospitalCtaMuted]}>
                  <ActivityIndicator color={palette.primary} />
                </View>
              ) : nearestHospital ? (
                <Pressable
                  style={({ pressed }) => [styles.hospitalCtaOuter, pressed && styles.pressed]}
                  onPress={() => void handleOpenNearestHospital()}
                  disabled={openingMaps}
                  accessibilityRole="button"
                  accessibilityLabel={`Open directions to ${nearestHospital.name}`}
                >
                  <LinearGradient
                    colors={['#B91C1C', '#DC2626', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.hospitalCta}
                  >
                    {openingMaps ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Text style={styles.hospitalCtaTitleLight}>
                          {nearestHospital.name}
                        </Text>
                        <Text style={styles.hospitalCtaSubLight}>
                          {nearestHospital.distanceKm} km
                          {nearestHospital.estimatedTravelTime
                            ? ` · ${nearestHospital.estimatedTravelTime}`
                            : ''}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={[styles.hospitalCta, styles.hospitalCtaMuted]}>
                  <Text style={styles.hospitalCtaTitle}>Unavailable</Text>
                </View>
              )}
            </View>
          ) : null}

          {readyToSave && !keyboardVisible ? (
            <Pressable
              style={({ pressed }) => [styles.saveWrap, shadow, pressed && styles.pressed]}
              onPress={() => void saveCheckIn(draft, messages)}
              disabled={saving}
            >
              <LinearGradient
                colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBar}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBarText}>Save check-in</Text>
                )}
              </LinearGradient>
            </Pressable>
          ) : null}

          <View style={[styles.composer, shadow]}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Message ${ASSISTANT_NAME}…`}
              placeholderTextColor={palette.textLight}
              multiline
              maxLength={500}
              editable={!typing && !saving}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              selectionColor={palette.primary}
              onFocus={() => {
                setTimeout(scrollToEnd, 150);
                setTimeout(scrollToEnd, 350);
              }}
              onContentSizeChange={() => {
                if (keyboardVisible) scrollToEnd();
              }}
            />
            <Pressable
              style={({ pressed }) => [styles.sendBtnOuter, pressed && styles.pressed]}
              onPress={() => {
                void handleSend(input);
                Keyboard.dismiss();
              }}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {canSend ? (
                <LinearGradient
                  colors={['#1D4ED8', '#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendBtn}
                >
                  <Text style={styles.sendBtnText}>Send</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.sendBtn, styles.sendBtnDisabled]}>
                  <Text style={[styles.sendBtnText, styles.sendBtnTextDisabled]}>Send</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, pagePad: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: p.background,
    },
    ambientGlow: {
      position: 'absolute',
      top: 80,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: isDark ? 'rgba(37,99,235,0.08)' : 'rgba(147,197,253,0.35)',
    },
    flex: { flex: 1 },

    header: {
      backgroundColor: p.surface,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      paddingHorizontal: pagePad,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: p.border,
    },
    headerCompact: {
      paddingBottom: spacing.sm,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    headerBarCompact: {
      marginBottom: 0,
    },
    backBtn: {
      minWidth: 56,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: p.primarySoft,
    },
    backBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
      textAlign: 'center',
    },
    backBtnSpacer: {
      minWidth: 56,
    },
    headerBrand: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    headerBrandText: {
      alignItems: 'flex-start',
      flexShrink: 1,
    },
    headerTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: p.text,
      letterSpacing: -0.3,
    },
    headerTagline: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 1,
      fontSize: 12,
    },
    greetingText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      lineHeight: 22,
      color: p.text,
      marginBottom: spacing.xs,
    },
    contextMeta: {
      ...typography.caption,
      color: p.textSecondary,
      marginBottom: spacing.xs,
    },
    disclaimerText: {
      ...typography.caption,
      color: p.textLight,
      fontSize: 11,
      lineHeight: 16,
    },
    progressSection: {
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    progressBar: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: p.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    progressCaption: {
      ...typography.caption,
      color: p.textMuted,
      fontSize: 11,
    },

    listContent: {
      paddingHorizontal: pagePad,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      flexGrow: 1,
    },
    messageBlock: {
      marginBottom: spacing.md + 2,
      alignItems: 'flex-start',
    },
    messageBlockUser: {
      alignItems: 'flex-end',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      maxWidth: '100%',
    },
    rowUser: {
      justifyContent: 'flex-end',
    },
    avatarSpacer: {
      width: 44,
    },
    bubbleWrap: {
      maxWidth: '84%',
      alignItems: 'flex-start',
    },
    bubbleWrapUser: {
      alignItems: 'flex-end',
    },
    bubble: {
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    bubbleAssistant: {
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      borderBottomLeftRadius: radius.sm,
      borderLeftWidth: 3,
      borderLeftColor: p.primary,
    },
    bubbleUser: {
      borderBottomRightRadius: radius.sm,
    },
    bubbleText: {
      ...typography.body,
      color: p.text,
      lineHeight: 23,
    },
    bubbleTextUser: {
      ...typography.body,
      color: '#FFFFFF',
      lineHeight: 23,
    },
    time: {
      ...typography.caption,
      fontSize: 10,
      color: p.textLight,
      marginTop: 5,
      marginLeft: 4,
    },
    timeUser: {
      marginRight: 4,
      textAlign: 'right',
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 120,
    },
    typingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: p.primary,
      opacity: 0.35,
    },
    dotMid: { opacity: 0.6 },
    dotLate: { opacity: 1 },
    typingText: {
      ...typography.caption,
      color: p.textMuted,
    },

    footer: {
      paddingTop: spacing.sm,
      backgroundColor: p.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    quickRepliesWrap: {
      paddingBottom: spacing.sm,
    },
    quickReplies: {
      paddingHorizontal: pagePad,
      gap: spacing.sm,
    },
    chip: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: isDark ? p.border : p.border,
      backgroundColor: isDark ? p.surfaceMuted : p.surface,
      paddingVertical: 11,
      paddingHorizontal: spacing.lg,
      maxWidth: 220,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: isDark ? p.text : p.primary,
    },
    saveWrap: {
      marginHorizontal: pagePad,
      marginBottom: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    saveBar: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md + 4,
    },
    saveBarText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: '#FFF',
      letterSpacing: 0.2,
    },
    hospitalCtaWrap: {
      marginHorizontal: pagePad,
      marginBottom: spacing.md,
    },
    hospitalCtaHint: {
      ...typography.caption,
      fontFamily: fonts.bodySemiBold,
      color: p.textMuted,
      marginBottom: spacing.sm,
      fontSize: 12,
      letterSpacing: 0.2,
    },
    hospitalCtaOuter: {
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    hospitalCta: {
      borderRadius: radius.xl,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      alignItems: 'flex-start',
      justifyContent: 'center',
      gap: 4,
    },
    hospitalCtaMuted: {
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    hospitalCtaTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
    },
    hospitalCtaSub: {
      ...typography.caption,
      color: p.textMuted,
      lineHeight: 18,
    },
    hospitalCtaTitleLight: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFF',
    },
    hospitalCtaSubLight: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.9)',
      lineHeight: 18,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginHorizontal: pagePad,
      padding: spacing.sm,
      borderRadius: radius.xxl,
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: radius.xl,
      backgroundColor: p.surfaceInset,
      paddingHorizontal: spacing.lg,
      paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
      fontFamily: fonts.body,
      fontSize: pagePad <= 16 ? 15 : 16,
      lineHeight: 22,
      color: p.text,
      includeFontPadding: false,
    },
    sendBtnOuter: {
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    sendBtn: {
      minHeight: 44,
      minWidth: 64,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      backgroundColor: p.border,
    },
    sendBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: '#FFFFFF',
    },
    sendBtnTextDisabled: {
      color: p.textMuted,
    },
    pressed: { opacity: 0.88 },
  });
}
