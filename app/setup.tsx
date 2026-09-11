import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { BrandMark } from '@/src/components/auth/BrandMark';
import { Screen } from '@/src/components/layout/Screen';
import { SurfaceCard } from '@/src/components/ScreenContainer';
import { Button } from '@/src/components/UiComponents';
import { useResponsive } from '@/src/utils/responsive';
import {
  FormField,
  TextField,
  SegmentedChoice,
  ChoiceList,
  FormSection,
  FormRow,
  FormProgress,
} from '@/src/components/FormField';
import {
  ACTIVITY_LEVELS,
  HYDRATION_STATUSES,
  GENERAL_STATUSES,
  type UserProfile,
} from '@/src/models/user';
import {
  HEALTH_CONDITION_OPTIONS,
  finalizeHealthConditions,
  primaryHealthCondition,
  splitHealthConditionsForForm,
} from '@/src/constants/health-conditions';
import { validateAge, validateRequired } from '@/src/utils/validation';
import { isProfileComplete } from '@/src/utils/profile-storage';
import { DISCLAIMER } from '@/src/constants/risk-levels';
import { DEFAULT_REMINDER_SETTINGS } from '@/src/models/check-in';
import { radius, spacing, typography, fonts } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

const STEPS = ['About you', 'Daily habits'] as const;
const HYDRATION_ICONS = ['water', 'water-outline', 'alert-circle-outline'] as const;

export default function SetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { saveProfile, saveEmergencyContact, refreshLocation, updateReminderSettings, profile, isLoading } =
    useIniTify();
  const { horizontalPadding } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createSetupStyles(palette, isDark), [palette, isDark]);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [healthConditions, setHealthConditions] = useState<string[]>(['None']);
  const [otherHealthCondition, setOtherHealthCondition] = useState('');
  const [generalStatus, setGeneralStatus] = useState('Feeling Well');
  const [activityLevel, setActivityLevel] = useState('');
  const [hydrationStatus, setHydrationStatus] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setAge(profile.riskFactors.age?.toString() ?? '');
    const parsed = splitHealthConditionsForForm(profile.riskFactors.healthConditions ?? ['None']);
    setHealthConditions(parsed.chips);
    setOtherHealthCondition(parsed.otherDetail);
    setActivityLevel(profile.riskFactors.activityLevel ?? '');
    setHydrationStatus(profile.riskFactors.hydrationStatus ?? '');
    setGeneralStatus(profile.riskFactors.generalStatus ?? 'Feeling Well');
  }, [profile]);

  useEffect(() => {
    if (profile?.name || !user?.displayName) return;
    setName(user.displayName);
  }, [profile?.name, user?.displayName]);

  function toggleHealthCondition(condition: string) {
    if (condition === 'None') {
      setHealthConditions(['None']);
      setOtherHealthCondition('');
      return;
    }
    setHealthConditions((prev) => {
      const withoutNone = prev.filter((c) => c !== 'None');
      if (withoutNone.includes(condition)) {
        const next = withoutNone.filter((c) => c !== condition);
        if (condition === 'Other') setOtherHealthCondition('');
        return next.length ? next : ['None'];
      }
      return [...withoutNone, condition];
    });
  }

  function validateStep1(): boolean {
    const next: Record<string, string> = {};
    const nameErr = validateRequired(name, 'Name');
    if (nameErr) next.name = nameErr;
    const ageErr = validateAge(age);
    if (ageErr) next.age = ageErr;
    if (!healthConditions.length) next.healthCondition = 'Select at least one health option.';
    if (healthConditions.includes('Other') && !otherHealthCondition.trim()) {
      next.otherHealthCondition = 'Please describe your other health condition.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {};
    if (!activityLevel) next.activityLevel = 'Pick the activity level that fits you best.';
    if (!hydrationStatus) next.hydrationStatus = 'Pick how hydrated you usually are.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) {
      setErrors({});
      setStep(2);
    }
  }

  function handleBack() {
    if (step === 2) {
      setErrors({});
      setStep(1);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  async function handleSave() {
    if (!validateStep2()) return;
    setSaving(true);
    try {
      const resolvedConditions = finalizeHealthConditions(healthConditions, otherHealthCondition);
      const profileData: UserProfile = {
        name: name.trim(),
        riskFactors: {
          age: Number(age),
          healthConditions: resolvedConditions,
          healthCondition: primaryHealthCondition(resolvedConditions),
          activityLevel,
          hydrationStatus,
          generalStatus,
        },
      };
      await saveProfile(profileData);
      const contact =
        contactName.trim() && contactPhone.trim()
          ? { name: contactName.trim(), phone: contactPhone.trim() }
          : null;
      if (contact) {
        await saveEmergencyContact(contact);
      }

      try {
        await updateReminderSettings({ ...DEFAULT_REMINDER_SETTINGS });
      } catch {
        /* reminders are optional — profile save is enough */
      }

      // Location is optional during setup; never block finish on permission APIs.
      try {
        await refreshLocation();
      } catch {
        /* ignore location failures */
      }

      router.replace('/(tabs)/home');
    } finally {
      setSaving(false);
    }
  }

  const heroTitles = [
    { title: 'About you', subtitle: 'Name, age, and health conditions' },
    { title: 'Daily habits', subtitle: 'Activity, hydration, and emergency contact' },
  ] as const;

  const hero = heroTitles[step - 1];

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!isLoading && isProfileComplete(profile)) return <Redirect href="/(tabs)/home" />;

  return (
    <Screen
      overline={`Step ${step} of ${STEPS.length}`}
      title={hero.title}
      subtitle={hero.subtitle}
      back
      onBackPress={handleBack}
      horizontalPadding={horizontalPadding}
    >
      <FormProgress current={step} total={STEPS.length} labels={[...STEPS]} />

      {step === 1 ? (
        <View style={styles.welcomeBanner}>
          <LinearGradient
            colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.welcomeGradient}
          >
            <BrandMark size={52} />
            <View style={styles.welcomeCopy}>
              <Text style={styles.welcomeTitle}>Your heat safety profile</Text>
              <Text style={styles.welcomeBody}>
                IniTify uses this to tailor risk levels and check-in guidance for Tuguegarao.
              </Text>
            </View>
          </LinearGradient>
        </View>
      ) : null}

      {step === 1 ? (
        <SurfaceCard>
          <FormSection
            step={1}
            title="Personal details"
            description="Helps calculate your personal heat risk"
          >
            <FormRow>
              <View style={styles.nameField}>
                <FormField label="Full name" required error={errors.name}>
                  <TextField
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    autoCapitalize="words"
                    autoComplete="name"
                    error={!!errors.name}
                    icon="person-outline"
                  />
                </FormField>
              </View>
              <View style={styles.ageField}>
                <FormField label="Age" required error={errors.age}>
                  <TextField
                    value={age}
                    onChangeText={setAge}
                    placeholder="Yrs"
                    keyboardType="number-pad"
                    error={!!errors.age}
                    icon="calendar-outline"
                  />
                </FormField>
              </View>
            </FormRow>

            <FormField
              label="Health conditions"
              required
              hint="Select all that apply"
              error={errors.healthCondition}
            >
              <View style={styles.chipGrid}>
                {HEALTH_CONDITION_OPTIONS.map((condition) => {
                  const active = healthConditions.includes(condition);
                  return (
                    <Pressable
                      key={condition}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleHealthCondition(condition)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {condition}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </FormField>

            {healthConditions.includes('Other') ? (
              <FormField
                label="Describe other condition"
                required
                hint="Type your health condition"
                error={errors.otherHealthCondition}
              >
                <TextField
                  value={otherHealthCondition}
                  onChangeText={setOtherHealthCondition}
                  placeholder="e.g. COPD, anemia, etc."
                  autoCapitalize="sentences"
                  error={!!errors.otherHealthCondition}
                  icon="create-outline"
                />
              </FormField>
            ) : null}
          </FormSection>

          <View style={styles.infoTip}>
            <Ionicons name="shield-checkmark-outline" size={16} color={palette.primary} />
            <Text style={styles.infoTipText}>
              Stored on this device and used only for heat safety guidance.
            </Text>
          </View>
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard>
            <FormSection
              step={2}
              title="Activity & hydration"
              description="These help refine your risk level during hot days"
            >
              <FormField label="Usual activity level" required error={errors.activityLevel}>
                <SegmentedChoice
                  options={[...ACTIVITY_LEVELS]}
                  selected={activityLevel}
                  onSelect={setActivityLevel}
                />
              </FormField>

              <FormField label="How hydrated are you usually?" required error={errors.hydrationStatus}>
                <ChoiceList
                  options={[...HYDRATION_STATUSES]}
                  icons={[...HYDRATION_ICONS]}
                  selected={hydrationStatus}
                  onSelect={setHydrationStatus}
                />
              </FormField>

              <FormField label="Current general status">
                <ChoiceList
                  options={[...GENERAL_STATUSES]}
                  selected={generalStatus}
                  onSelect={setGeneralStatus}
                />
              </FormField>
            </FormSection>
          </SurfaceCard>

          <SurfaceCard style={styles.optionalCard}>
            <FormSection
              title="Emergency contact"
              description="Optional — for quick reach in an emergency"
              icon="call-outline"
            >
              <FormRow>
                <View style={styles.halfField}>
                  <FormField label="Name">
                    <TextField
                      value={contactName}
                      onChangeText={setContactName}
                      placeholder="Contact name"
                      icon="person-outline"
                    />
                  </FormField>
                </View>
                <View style={styles.halfField}>
                  <FormField label="Phone">
                    <TextField
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      placeholder="09xx xxx xxxx"
                      keyboardType="phone-pad"
                      icon="call-outline"
                    />
                  </FormField>
                </View>
              </FormRow>
            </FormSection>
          </SurfaceCard>
        </>
      )}

      <View style={styles.actions}>
        {step === 2 ? (
          <Button
            label="Back"
            variant="ghost"
            onPress={() => {
              setErrors({});
              setStep(1);
            }}
            fullWidth={false}
            icon="chevron-back"
          />
        ) : null}
        <View style={styles.primaryAction}>
          {step === 1 ? (
            <Button label="Continue" onPress={handleNext} icon="arrow-forward" />
          ) : (
            <Button
              label={saving ? 'Saving…' : 'Save and start'}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
              icon="checkmark-circle"
            />
          )}
        </View>
      </View>

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </Screen>
  );
}

function createSetupStyles(palette: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    welcomeBanner: {
      borderRadius: radius.xl,
      overflow: 'hidden',
      marginBottom: spacing.sm,
    },
    welcomeGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    welcomeCopy: {
      flex: 1,
      gap: 4,
    },
    welcomeTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: '#FFFFFF',
    },
    welcomeBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      color: 'rgba(255,255,255,0.88)',
    },
    nameField: { flex: 2, minWidth: 0 },
    ageField: { flex: 1, minWidth: 88, maxWidth: 110 },
    halfField: { flex: 1, minWidth: 0 },
    infoTip: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: palette.primarySoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    infoTipText: { ...typography.caption, color: palette.textSecondary, flex: 1, lineHeight: 17 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      borderWidth: 1.5,
      borderColor: palette.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: isDark ? palette.surface : palette.surfaceInset,
    },
    chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    chipText: { fontSize: 13, color: palette.text, fontWeight: '500' },
    chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    optionalCard: { borderStyle: 'dashed' as const },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    primaryAction: { flex: 1, minWidth: 0 },
    disclaimer: {
      ...typography.caption,
      color: palette.textLight,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: -spacing.sm,
    },
  });
}
