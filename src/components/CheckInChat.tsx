import { BrandMark } from '@/src/components/auth/BrandMark';
import { RISK_LEVEL_COLORS, RISK_LEVEL_SHORT_LABELS } from '@/src/constants/risk-levels';
import { tifyChipLabel, type TifyLanguagePreference } from '@/src/constants/tify-language-preference';
import type { CheckInChatDraft, CheckInChatMessage, CheckInChatStep } from '@/src/models/check-in-chat';
import type { UserLocation } from '@/src/models/location';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { UserProfile } from '@/src/models/user';
import { checkInChatService } from '@/src/services/check-in/check-in-chat.service';
import { hospitalService, type HospitalInfo } from '@/src/services/hospital/hospital.service';
import { locationService } from '@/src/services/location/location.service';
import { fonts, radius, spacing, typography } from '@/src/theme';
import { cardShadow } from '@/src/theme/shadows';
import type { AppPalette } from '@/src/theme/palettes';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { resolveHospitalSearchLocation } from '@/src/utils/hospital-location';
import type { LiveWeatherFacts } from '@/src/utils/live-heat';
import { useResponsive, type ResponsiveMetrics } from '@/src/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ASSISTANT_NAME = 'Tify';

const CHECK_IN_STEPS: { key: CheckInChatStep; label: string; shortLabel: string }[] = [
  { key: 'feeling', label: 'Feeling', shortLabel: 'Feel' },
  { key: 'activity', label: 'Activity', shortLabel: 'Active' },
  { key: 'hydration', label: 'Hydration', shortLabel: 'Water' },
];

function stepIndex(step: CheckInChatStep): number {
  if (step === 'greeting' || step === 'feeling') return 0;
  if (step === 'activity') return 1;
  if (step === 'hydration') return 2;
  if (step === 'notes' || step === 'confirm' || step === 'done') return 2;
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

function chipDisplayLabel(reply: string, languagePreference: TifyLanguagePreference): string {
  return tifyChipLabel(reply, languagePreference);
}

interface CheckInChatProps {
  profile: UserProfile;
  languagePreference: TifyLanguagePreference;
  heatIndexC: number | null;
  riskLevel: HeatRiskLevel | null;
  weatherFacts?: LiveWeatherFacts | null;
  location?: UserLocation | null;
  onRequestLocation?: () => Promise<void>;
  onSave: (input: {
    hydrationStatus: string;
    activityLevel: string;
    generalStatus: string;
    notes?: string;
    chatMessages: CheckInChatMessage[];
  }) => Promise<void>;
  /** Live profile sync while chatting — updates risk factors before final save. */
  onDraftAdapt?: (draft: CheckInChatDraft) => void | Promise<void>;
  onChangeLanguage?: () => void;
  onClose?: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function TifyAvatar({ size = 34, online = false }: { size?: number; online?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View style={tifyAvatarStyles.wrap}>
      <View
        style={[
          tifyAvatarStyles.shell,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            backgroundColor: palette.surface,
            borderColor: palette.primarySoft,
          },
        ]}
      >
        <BrandMark size={size} />
      </View>
      {online ? <View style={[tifyAvatarStyles.onlineDot, { borderColor: palette.surface }]} /> : null}
    </View>
  );
}

const tifyAvatarStyles = StyleSheet.create({
  wrap: { position: 'relative' },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
});

interface CheckInHeaderProps {
  styles: ReturnType<typeof createStyles>;
  primaryColor: string;
  usesAi: boolean;
  activeStep: number;
  draftStep: CheckInChatStep;
  heatIndexC: number | null;
  riskLevel: HeatRiskLevel | null;
  onClose?: () => void;
  onChangeLanguage?: () => void;
  compact?: boolean;
}

function CheckInHeader({
  styles,
  primaryColor,
  usesAi,
  activeStep,
  draftStep,
  heatIndexC,
  riskLevel,
  onClose,
  onChangeLanguage,
  compact = false,
}: CheckInHeaderProps) {
  const showSteps = !compact && draftStep !== 'done';
  const riskColor = riskLevel ? RISK_LEVEL_COLORS[riskLevel] : primaryColor;

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={styles.headerBar}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={primaryColor} />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}

        <View style={styles.headerBrand}>
          <TifyAvatar size={compact ? 30 : 36} online />
          <View style={styles.headerBrandText}>
            <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
            <Text style={styles.headerTagline}>{usesAi ? 'AI heat check-in' : 'Heat check-in'}</Text>
          </View>
        </View>

        {onChangeLanguage ? (
          <Pressable
            onPress={onChangeLanguage}
            style={({ pressed }) => [styles.langBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Change language"
            hitSlop={8}
          >
            <Ionicons name="language-outline" size={22} color={primaryColor} />
          </Pressable>
        ) : (
          <View style={styles.backBtnSpacer} />
        )}
      </View>

      {heatIndexC != null || riskLevel ? (
        <View style={styles.contextStrip}>
          {heatIndexC != null ? (
            <View style={styles.contextChip}>
              <Ionicons name="flame-outline" size={13} color={riskColor} />
              <Text style={styles.contextChipText}>{Number(heatIndexC.toFixed(1))}°C</Text>
            </View>
          ) : null}
          {riskLevel ? (
            <View style={[styles.contextChip, { borderColor: `${riskColor}55` }]}>
              <View style={[styles.contextRiskDot, { backgroundColor: riskColor }]} />
              <Text style={[styles.contextChipText, { color: riskColor }]}>
                {RISK_LEVEL_SHORT_LABELS[riskLevel]}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {showSteps ? (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            {CHECK_IN_STEPS.map((step, index) => {
              const filled = index <= activeStep;
              return (
                <View
                  key={step.key}
                  style={[styles.progressSegment, filled && styles.progressSegmentFilled]}
                />
              );
            })}
          </View>
          <View style={styles.progressLabels}>
            {CHECK_IN_STEPS.map((step, index) => {
              const current = index === activeStep;
              return (
                <Text
                  key={step.key}
                  style={[styles.progressLabel, current && styles.progressLabelActive]}
                  numberOfLines={1}
                >
                  {compact ? step.shortLabel : step.label}
                </Text>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function CheckInChat({
  profile,
  languagePreference,
  heatIndexC,
  riskLevel,
  weatherFacts = null,
  location = null,
  onRequestLocation,
  onSave,
  onDraftAdapt,
  onChangeLanguage,
  onClose,
}: CheckInChatProps) {
  const { palette, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const responsive = useResponsive();
  const pagePad = responsive.horizontalPadding;
  const styles = useMemo(
    () => createStyles(palette, isDark, pagePad, responsive),
    [palette, isDark, pagePad, responsive],
  );
  const listRef = useRef<FlatList<CheckInChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);
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
  const [hospitalSearchLocation, setHospitalSearchLocation] = useState<UserLocation | null>(null);
  const [hospitalUsesGps, setHospitalUsesGps] = useState(false);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [hospitalStatus, setHospitalStatus] = useState<string | null>(null);
  const [openingMaps, setOpeningMaps] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const activeStep = stepIndex(draft.step);
  const canSend = Boolean(input.trim()) && !typing && !saving;
  const greetingHeatSynced = useRef(false);
  const chatInitializedRef = useRef(false);

  // Start conversation once per screen visit — do NOT reset when profile updates after save.
  useEffect(() => {
    if (chatInitializedRef.current) return;
    chatInitializedRef.current = true;
    greetingHeatSynced.current = false;
    const start = checkInChatService.startConversation(
      profile,
      heatIndexC,
      weatherFacts,
      languagePreference,
    );
    setMessages(start.messages);
    setDraft(start.draft);
    setUsesAi(checkInChatService.isAiConfigured());
    setQuickReplies(start.quickReplies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languagePreference]);

  // Adaptive AI greeting + sync heat index into opener when weather loads.
  useEffect(() => {
    if (greetingHeatSynced.current) return;
    if (messages.length !== 1 || messages[0]?.role !== 'assistant') return;

    greetingHeatSynced.current = true;
    const baseMessage = messages[0];

    void (async () => {
      if (checkInChatService.isAiConfigured()) {
        const aiGreeting = await checkInChatService.enrichGreeting(
          profile,
          heatIndexC,
          weatherFacts,
          languagePreference,
        );
        if (aiGreeting) {
          setMessages([{ ...baseMessage, content: aiGreeting }]);
          setUsesAi(true);
          return;
        }
      }

      const start = checkInChatService.startConversation(
        profile,
        heatIndexC,
        weatherFacts,
        languagePreference,
      );
      setMessages(start.messages);
    })();
  }, [heatIndexC, weatherFacts, messages, profile, languagePreference]);

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
    if (!showHospitalCta) return;

    if (!location && onRequestLocation) {
      void onRequestLocation();
    }

    const { location: searchAt, isGps } = resolveHospitalSearchLocation(
      location ?? locationService.getLastKnownLocation(),
    );
    setHospitalSearchLocation(searchAt);
    setHospitalUsesGps(isGps);

    let cancelled = false;
    setHospitalLoading(true);
      setHospitalStatus(
      isGps ? null : 'City reference location — enable GPS for your nearest hospital.',
    );

    void hospitalService.findNearest(searchAt).then((result) => {
      if (cancelled) return;
      setHospitalLoading(false);
      if (result.status === 'success' && result.data) {
        setNearestHospital(result.data);
        if (isGps) {
          setHospitalStatus(null);
        }
      } else {
        setNearestHospital(null);
        setHospitalStatus(result.message || 'Could not find a nearby hospital.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showHospitalCta, location, onRequestLocation]);

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
    const origin = hospitalSearchLocation ?? resolveHospitalSearchLocation(location).location;
    if (!nearestHospital || openingMaps) return;
    setOpeningMaps(true);
    try {
      const result = await hospitalService.openNavigation(nearestHospital, origin);
      if (result.status !== 'success') {
        setHospitalStatus(result.message || 'Could not open maps.');
      }
    } finally {
      setOpeningMaps(false);
    }
  }, [hospitalSearchLocation, location, nearestHospital, openingMaps]);

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
          weather: weatherFacts,
          languagePreference,
        });

        const fullTranscript = [...nextMessages, result.assistantMessage];
        setMessages(fullTranscript);
        setDraft(result.draft);
        setQuickReplies(result.quickReplies);
        setReadyToSave(result.readyToSave);
        setUsesAi(result.usesAi);
        if (result.showHospitalCta) setShowHospitalCta(true);

        if (onDraftAdapt) {
          void onDraftAdapt(result.draft);
        }

        if (
          result.readyToSave &&
          result.draft.hydrationStatus &&
          result.draft.activityLevel &&
          result.draft.generalStatus
        ) {
          await saveCheckIn(result.draft, fullTranscript);
        }
      } finally {
        setTyping(false);
      }
    },
    [typing, saving, profile, heatIndexC, weatherFacts, riskLevel, draft, messages, saveCheckIn, onDraftAdapt, languagePreference],
  );

  const renderMessage = ({ item, index }: { item: CheckInChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const showAvatar = !isUser && (index === 0 || messages[index - 1]?.role !== 'assistant');

    return (
      <View style={[styles.messageBlock, isUser && styles.messageBlockUser]}>
        <View style={[styles.row, isUser && styles.rowUser]}>
          {!isUser ? (
            showAvatar ? <TifyAvatar size={28} /> : <View style={styles.avatarSpacer} />
          ) : null}
          <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
            {isUser ? (
              <LinearGradient
                colors={['#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, styles.bubbleUser]}
              >
                <Text style={styles.bubbleTextUser}>{item.content}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.bubbleAssistant]}>
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 12) : 0}
        enabled={Platform.OS === 'ios'}
      >
        <CheckInHeader
          styles={styles}
          primaryColor={palette.primary}
          usesAi={usesAi}
          activeStep={activeStep}
          draftStep={draft.step}
          heatIndexC={heatIndexC}
          riskLevel={riskLevel}
          onClose={onClose}
          onChangeLanguage={onChangeLanguage}
          compact={keyboardVisible || responsive.isCompact}
        />

        <View style={styles.chatPanel}>
          <FlatList
            ref={listRef}
            style={styles.flex}
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
                    <TifyAvatar size={28} />
                    <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                      <View style={styles.typingDots}>
                        <View style={styles.dot} />
                        <View style={[styles.dot, styles.dotMid]} />
                        <View style={[styles.dot, styles.dotLate]} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null
            }
          />
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: keyboardVisible
                ? spacing.sm
                : Math.max(insets.bottom, spacing.md),
            },
          ]}
        >
          {quickReplies?.length && !keyboardVisible ? (
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
                    {chipDisplayLabel(reply, languagePreference)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {showHospitalCta && !keyboardVisible ? (
            <View style={styles.hospitalCtaWrap}>
              <View style={styles.hospitalCtaHead}>
                <View style={styles.hospitalCtaHeadLeft}>
                  <View style={styles.hospitalCtaIconWrap}>
                    <Ionicons name="medkit" size={16} color="#DC2626" />
                  </View>
                  <Text style={styles.hospitalCtaHint}>Nearest hospital</Text>
                </View>
                <Pressable
                  onPress={() => router.push('/hospital')}
                  style={({ pressed }) => [styles.hospitalSeeAll, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="See all hospitals"
                >
                  <Text style={styles.hospitalSeeAllText}>See all</Text>
                  <Ionicons name="chevron-forward" size={14} color={palette.primary} />
                </Pressable>
              </View>

              {hospitalLoading ? (
                <View style={[styles.hospitalCtaCard, styles.hospitalCtaMuted]}>
                  <ActivityIndicator color={palette.primary} />
                  <Text style={styles.hospitalLoadingText}>Finding nearest hospital…</Text>
                </View>
              ) : nearestHospital ? (
                <View style={styles.hospitalCtaOuter}>
                  <LinearGradient
                    colors={isDark ? ['#991B1B', '#DC2626'] : ['#DC2626', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.hospitalCtaCard}
                  >
                    <View style={styles.hospitalNearestBadge}>
                      <Ionicons name="star" size={10} color="#FFFFFF" />
                      <Text style={styles.hospitalNearestBadgeText}>
                        {hospitalUsesGps ? 'Closest to you' : 'City reference'}
                      </Text>
                    </View>
                    <Text style={styles.hospitalCtaTitleLight} numberOfLines={2}>
                      {nearestHospital.name}
                    </Text>
                    <Text style={styles.hospitalCtaAddressLight} numberOfLines={2}>
                      {nearestHospital.address}
                    </Text>
                    <View style={styles.hospitalStatRow}>
                      <View style={styles.hospitalStatPill}>
                        <Ionicons name="navigate-outline" size={11} color="#FFFFFF" />
                        <Text style={styles.hospitalStatPillText}>{nearestHospital.distanceKm} km</Text>
                      </View>
                      {nearestHospital.estimatedTravelTime ? (
                        <View style={styles.hospitalStatPill}>
                          <Ionicons name="time-outline" size={11} color="#FFFFFF" />
                          <Text style={styles.hospitalStatPillText}>
                            {nearestHospital.estimatedTravelTime.replace('~', '')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.hospitalCtaActions}>
                      <Pressable
                        onPress={() => void handleOpenNearestHospital()}
                        disabled={openingMaps}
                        style={({ pressed }) => [
                          styles.hospitalBtnPrimary,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Get directions to ${nearestHospital.name}`}
                      >
                        {openingMaps ? (
                          <ActivityIndicator color="#DC2626" size="small" />
                        ) : (
                          <>
                            <Ionicons name="navigate" size={17} color="#DC2626" />
                            <Text style={styles.hospitalBtnPrimaryText}>Directions</Text>
                          </>
                        )}
                      </Pressable>
                      {nearestHospital.phone ? (
                        <Pressable
                          onPress={() =>
                            void Linking.openURL(`tel:${nearestHospital.phone!.replace(/\s/g, '')}`)
                          }
                          style={({ pressed }) => [
                            styles.hospitalBtnGhost,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Call ${nearestHospital.name}`}
                        >
                          <Ionicons name="call" size={17} color="#FFFFFF" />
                          <Text style={styles.hospitalBtnGhostText}>Call</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.hospitalCtaCard, styles.hospitalCtaMuted]}>
                  <Ionicons name="medkit-outline" size={22} color={palette.textMuted} />
                  <Text style={styles.hospitalCtaTitle}>
                    {hospitalStatus ?? 'Hospital unavailable'}
                  </Text>
                </View>
              )}

              {!hospitalUsesGps && onRequestLocation ? (
                <Pressable
                  style={({ pressed }) => [styles.hospitalGpsLink, pressed && styles.pressed]}
                  onPress={() => void handleRequestLocation()}
                  disabled={requestingLocation}
                  accessibilityRole="button"
                  accessibilityLabel="Enable GPS for nearest hospital"
                >
                  {requestingLocation ? (
                    <ActivityIndicator color={palette.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons name="locate-outline" size={16} color={palette.primary} />
                      <Text style={styles.hospitalGpsLinkText}>Use GPS for accurate distance</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {readyToSave && !keyboardVisible ? (
            <Pressable
              style={({ pressed }) => [styles.saveWrap, pressed && styles.pressed]}
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
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                    <Text style={styles.saveBarText}>Save check-in</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          ) : null}

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message…"
              placeholderTextColor={palette.textLight}
              multiline
              maxLength={500}
              editable={!typing && !saving}
              textAlignVertical="center"
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
              style={({ pressed }) => [
                styles.sendBtnOuter,
                canSend ? styles.sendBtnReady : styles.sendBtnIdle,
                pressed && canSend && styles.pressed,
              ]}
              onPress={() => {
                void handleSend(input);
                Keyboard.dismiss();
              }}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {typing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={canSend ? '#FFF' : palette.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(p: AppPalette, isDark: boolean, pagePad: number, r: ResponsiveMetrics) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? p.background : '#F1F5F9',
    },
    flex: { flex: 1 },

    header: {
      backgroundColor: p.surface,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: pagePad,
      ...cardShadow(),
      zIndex: 2,
    },
    headerCompact: {
      paddingBottom: spacing.sm,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.primarySoft,
      flexShrink: 0,
    },
    backBtnSpacer: {
      width: 40,
      flexShrink: 0,
    },
    langBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      flexShrink: 0,
    },
    headerBrand: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    headerBrandText: {
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
      letterSpacing: -0.3,
    },
    headerTagline: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 1,
      fontSize: 12,
    },
    contextStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    contextChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceInset,
      borderWidth: 1,
      borderColor: p.border,
    },
    contextRiskDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    contextChipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textSecondary,
    },
    progressSection: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    progressTrack: {
      flexDirection: 'row',
      gap: 4,
      height: 4,
    },
    progressSegment: {
      flex: 1,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceInset,
    },
    progressSegmentFilled: {
      backgroundColor: p.primary,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
      flex: 1,
      fontFamily: fonts.bodyMedium,
      fontSize: r.isCompact ? 10 : 11,
      color: p.textMuted,
      textAlign: 'center',
    },
    progressLabelActive: {
      color: p.primary,
      fontFamily: fonts.bodySemiBold,
    },

    chatPanel: {
      flex: 1,
      backgroundColor: isDark ? p.background : '#F8FAFC',
    },

    listContent: {
      paddingHorizontal: pagePad,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      flexGrow: 1,
    },
    messageBlock: {
      marginBottom: spacing.md + 4,
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
      width: 36,
    },
    bubbleWrap: {
      maxWidth: r.chatBubbleMaxWidth,
      alignItems: 'flex-start',
      flexShrink: 1,
    },
    bubbleWrapUser: {
      alignItems: 'flex-end',
    },
    bubble: {
      borderRadius: 18,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md + 2,
    },
    bubbleAssistant: {
      backgroundColor: p.surface,
      borderWidth: 1,
      borderColor: p.border,
      borderBottomLeftRadius: 6,
    },
    bubbleUser: {
      borderBottomRightRadius: 6,
    },
    bubbleText: {
      ...typography.body,
      color: p.text,
      lineHeight: 22,
      fontSize: 15,
    },
    bubbleTextUser: {
      ...typography.body,
      color: '#FFFFFF',
      lineHeight: 22,
      fontSize: 15,
    },
    time: {
      ...typography.caption,
      fontSize: 10,
      color: p.textLight,
      marginTop: 4,
      marginLeft: 4,
    },
    timeUser: {
      marginRight: 4,
      textAlign: 'right',
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 52,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    typingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: p.primary,
      opacity: 0.35,
    },
    dotMid: { opacity: 0.6 },
    dotLate: { opacity: 1 },

    footer: {
      paddingTop: spacing.sm,
      paddingHorizontal: 0,
      backgroundColor: p.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
      ...cardShadow(),
    },
    quickReplies: {
      paddingHorizontal: pagePad,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    chip: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: p.primary,
      backgroundColor: p.primarySoft,
      paddingVertical: 10,
      paddingHorizontal: r.isCompact ? spacing.md : spacing.lg,
      maxWidth: r.chipMaxWidth,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: r.isCompact ? 13 : 14,
      color: p.primary,
    },
    saveWrap: {
      marginHorizontal: pagePad,
      marginBottom: spacing.md,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    saveBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
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
    hospitalCtaHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    hospitalCtaHeadLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    hospitalCtaIconWrap: {
      width: 28,
      height: 28,
      borderRadius: radius.md,
      backgroundColor: isDark ? 'rgba(220,38,38,0.2)' : '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hospitalCtaHint: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.text,
    },
    hospitalSeeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: spacing.xs,
    },
    hospitalSeeAllText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.primary,
    },
    hospitalCtaOuter: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      ...cardShadow(),
    },
    hospitalCtaCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      alignItems: 'stretch',
    },
    hospitalCtaMuted: {
      backgroundColor: p.surfaceInset,
      borderWidth: 1,
      borderColor: p.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    hospitalLoadingText: {
      ...typography.caption,
      color: p.textMuted,
    },
    hospitalNearestBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      marginBottom: 2,
    },
    hospitalNearestBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: '#FFFFFF',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    hospitalCtaTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.text,
      textAlign: 'center',
    },
    hospitalCtaTitleLight: {
      fontFamily: fonts.headerSemi,
      fontSize: 16,
      color: '#FFFFFF',
      lineHeight: 22,
    },
    hospitalCtaAddressLight: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.88)',
      lineHeight: 17,
    },
    hospitalStatRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: 2,
      marginBottom: spacing.xs,
    },
    hospitalStatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    hospitalStatPillText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: '#FFFFFF',
    },
    hospitalCtaActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    hospitalBtnPrimary: {
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
    hospitalBtnPrimaryText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: '#DC2626',
    },
    hospitalBtnGhost: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.5)',
      minHeight: 44,
    },
    hospitalBtnGhostText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: '#FFFFFF',
    },
    hospitalGpsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
    },
    hospitalGpsLinkText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.primary,
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: pagePad,
      marginBottom: spacing.xs,
      minHeight: 56,
      paddingVertical: 6,
      paddingLeft: spacing.md,
      paddingRight: 6,
      borderRadius: radius.xxl,
      backgroundColor: p.surfaceInset,
      borderWidth: 1,
      borderColor: p.border,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 110,
      paddingTop: Platform.OS === 'ios' ? 12 : 10,
      paddingBottom: Platform.OS === 'ios' ? 12 : 10,
      paddingRight: spacing.sm,
      fontFamily: fonts.body,
      fontSize: pagePad <= 16 ? 15 : 16,
      lineHeight: 20,
      color: p.text,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    sendBtnOuter: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    sendBtnReady: {
      backgroundColor: p.primary,
    },
    sendBtnIdle: {
      backgroundColor: p.border,
    },
    pressed: { opacity: 0.88 },
  });
}

