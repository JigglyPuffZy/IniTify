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
import { Ionicons } from '@expo/vector-icons';
import type { UserProfile } from '@/src/models/user';
import type { HeatRiskLevel } from '@/src/models/risk';
import type { UserLocation } from '@/src/models/location';
import type { CheckInChatDraft, CheckInChatMessage, CheckInChatStep } from '@/src/models/check-in-chat';
import { checkInChatService } from '@/src/services/check-in/check-in-chat.service';
import { hospitalService, type HospitalInfo } from '@/src/services/hospital/hospital.service';
import { BrandMark } from '@/src/components/auth/BrandMark';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { cardShadow, fonts, layout, radius, spacing, typography } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';
import { getHeroGradient } from '@/src/theme/palettes';

const ASSISTANT_NAME = 'Tify';

const CHECK_IN_STEPS: { key: CheckInChatStep; label: string }[] = [
  { key: 'hydration', label: 'Hydration' },
  { key: 'activity', label: 'Activity' },
  { key: 'feeling', label: 'Feeling' },
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
  onClose?: () => void;
  compact?: boolean;
}

function CheckInHeader({
  styles,
  primaryColor,
  usesAi,
  activeStep,
  draftStep,
  onClose,
  compact = false,
}: CheckInHeaderProps) {
  const showSteps = !compact && !usesAi && draftStep !== 'done';

  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={[styles.headerBar, !showSteps && styles.headerBarCompact]}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={primaryColor} />
          </Pressable>
        ) : null}

        <View style={styles.headerBrand}>
          <TifyAvatar size={compact ? 28 : 32} online />
          <View style={styles.headerBrandText}>
            <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
            <Text style={styles.headerTagline}>Online</Text>
          </View>
        </View>
      </View>

      {showSteps ? (
        <View style={styles.progressSection}>
          <View style={styles.stepDots}>
            {CHECK_IN_STEPS.map((step, index) => {
              const done = index < activeStep;
              const current = index === activeStep;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      current && styles.stepDotCurrent,
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    ) : (
                      <Text style={[styles.stepDotNum, current && styles.stepDotNumActive]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, current && styles.stepLabelActive]}>
                    {step.label}
                  </Text>
                </View>
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
            showAvatar ? <TifyAvatar size={30} online /> : <View style={styles.avatarSpacer} />
          ) : null}
          <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
            {!isUser && showAvatar ? <Text style={styles.senderLabel}>{ASSISTANT_NAME}</Text> : null}
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
          primaryColor={palette.primary}
          usesAi={usesAi}
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
                  <TifyAvatar size={30} online />
                  <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                    <View style={styles.typingDots}>
                      <View style={styles.dot} />
                      <View style={[styles.dot, styles.dotMid]} />
                      <View style={[styles.dot, styles.dotLate]} />
                    </View>
                    <Text style={styles.typingText}>Tify is typing...</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />

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
            <View style={styles.quickRepliesWrap}>
              <Text style={styles.quickRepliesHint}>Quick replies</Text>
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
              <Text style={styles.hospitalCtaHint}>Need care nearby?</Text>
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
                    <>
                      <Ionicons name="location-outline" size={18} color={palette.primary} />
                      <Text style={styles.hospitalCtaTitle}>Enable location</Text>
                    </>
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
                      <View style={styles.hospitalCtaRow}>
                        <Ionicons name="navigate" size={20} color="#FFF" />
                        <View style={styles.hospitalCtaTextCol}>
                          <Text style={styles.hospitalCtaTitleLight}>{nearestHospital.name}</Text>
                          <Text style={styles.hospitalCtaSubLight}>
                            {nearestHospital.distanceKm} km
                            {nearestHospital.estimatedTravelTime
                              ? ` · ${nearestHospital.estimatedTravelTime}`
                              : ''}
                            {' · Tap for directions'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              ) : (
                <View style={[styles.hospitalCta, styles.hospitalCtaMuted]}>
                  <Text style={styles.hospitalCtaTitle}>
                    {hospitalStatus ?? 'Hospital unavailable'}
                  </Text>
                </View>
              )}
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
              placeholder="Message Tify..."
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

function createStyles(p: AppPalette, isDark: boolean, pagePad: number) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: p.background,
    },
    ambientGlow: {
      position: 'absolute',
      top: 60,
      right: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : 'rgba(147,197,253,0.4)',
    },
    flex: { flex: 1 },

    header: {
      backgroundColor: p.surface,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      paddingHorizontal: pagePad,
      borderBottomLeftRadius: radius.xxl,
      borderBottomRightRadius: radius.xxl,
      borderBottomWidth: 0,
    },
    headerCompact: {
      paddingBottom: spacing.sm,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.sm,
    },
    headerBarCompact: {
      marginBottom: 0,
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
    headerBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
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
    progressSection: {
      marginTop: spacing.md,
    },
    stepDots: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    stepItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.surfaceInset,
      borderWidth: 1,
      borderColor: p.border,
    },
    stepDotDone: {
      backgroundColor: p.primary,
      borderColor: p.primary,
    },
    stepDotCurrent: {
      backgroundColor: p.primary,
      borderColor: p.primary,
    },
    stepDotNum: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textMuted,
    },
    stepDotNumActive: {
      color: '#FFF',
    },
    stepLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: p.textMuted,
      textAlign: 'center',
    },
    stepLabelActive: {
      color: p.primary,
      fontFamily: fonts.bodySemiBold,
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
      width: 38,
    },
    bubbleWrap: {
      maxWidth: '82%',
      alignItems: 'flex-start',
    },
    bubbleWrapUser: {
      alignItems: 'flex-end',
    },
    senderLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: p.primary,
      marginBottom: 4,
      marginLeft: 4,
    },
    bubble: {
      borderRadius: 20,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
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
      gap: spacing.sm,
      minWidth: 128,
      paddingVertical: 14,
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
    typingText: {
      ...typography.caption,
      color: p.textMuted,
    },

    footer: {
      paddingTop: spacing.md,
      backgroundColor: p.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    quickRepliesWrap: {
      paddingBottom: spacing.sm,
    },
    quickRepliesHint: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textMuted,
      paddingHorizontal: pagePad,
      marginBottom: spacing.sm,
    },
    quickReplies: {
      paddingHorizontal: pagePad,
      gap: spacing.sm,
    },
    chip: {
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: p.primary,
      backgroundColor: p.primarySoft,
      paddingVertical: 10,
      paddingHorizontal: spacing.lg,
      maxWidth: 220,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
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
    hospitalCtaHint: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.textMuted,
      marginBottom: spacing.sm,
    },
    hospitalCtaOuter: {
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    hospitalCta: {
      borderRadius: radius.xl,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    hospitalCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    hospitalCtaTextCol: {
      flex: 1,
      gap: 2,
    },
    hospitalCtaMuted: {
      backgroundColor: p.surfaceInset,
      borderWidth: 1,
      borderColor: p.border,
    },
    hospitalCtaTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
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

