import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/UiComponents';
import { FormField, TextField } from '@/src/components/FormField';
import {
  HEALTH_CONDITION_OPTIONS,
  finalizeHealthConditions,
  primaryHealthCondition,
  splitHealthConditionsForForm,
  type HealthConditionOption,
} from '@/src/constants/health-conditions';
import { validateAge } from '@/src/utils/validation';
import type { UserProfile } from '@/src/models/user';
import { useResponsive } from '@/src/utils/responsive';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';
import { spacing, radius, typography, fonts, cardShadow } from '@/src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CONDITION_ICONS: Record<HealthConditionOption, IconName> = {
  'Hypertension / High Blood Pressure': 'heart-outline',
  'Heart Disease': 'heart',
  Asthma: 'fitness-outline',
  Diabetes: 'water-outline',
  'Chronic Respiratory Disease': 'cloud-outline',
  'Kidney Disease': 'medical-outline',
  'Heat Sensitivity': 'flame-outline',
  'Cold Sensitivity': 'snow-outline',
  Other: 'ellipsis-horizontal',
  None: 'checkmark-circle-outline',
};

const QUICK_LINKS: { title: string; subtitle: string; href: string; icon: IconName }[] = [
  { title: 'Check-in', subtitle: 'Update how you feel', href: '/check-in', icon: 'pulse-outline' },
  {
    title: 'Reminders',
    subtitle: 'Schedule & alerts',
    href: '/reminder-settings',
    icon: 'alarm-outline',
  },
  {
    title: 'History',
    subtitle: 'Past check-ins',
    href: '/check-in-history',
    icon: 'time-outline',
  },
];

function profileInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function HealthProfileScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const shadow = useMemo(() => cardShadow(), []);

  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(profile?.riskFactors.age?.toString() ?? '');
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    profile?.riskFactors.healthConditions ?? ['None'],
  );
  const [otherHealthCondition, setOtherHealthCondition] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setAge(profile.riskFactors.age?.toString() ?? '');
    const parsed = splitHealthConditionsForForm(profile.riskFactors.healthConditions ?? ['None']);
    setSelectedConditions(parsed.chips);
    setOtherHealthCondition(parsed.otherDetail);
  }, [profile]);

  if (!profile) return <Redirect href="/" />;

  const initials = profileInitials(name || profile.name);
  const conditionCount = selectedConditions.filter((c) => c !== 'None').length;

  function toggleCondition(condition: string) {
    if (condition === 'None') {
      setSelectedConditions(['None']);
      setOtherHealthCondition('');
      return;
    }
    setSelectedConditions((prev) => {
      const withoutNone = prev.filter((c) => c !== 'None');
      if (withoutNone.includes(condition)) {
        const next = withoutNone.filter((c) => c !== condition);
        if (condition === 'Other') setOtherHealthCondition('');
        return next.length ? next : ['None'];
      }
      return [...withoutNone, condition];
    });
  }

  async function handleSave() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required.';
    const ageErr = validateAge(age);
    if (ageErr) next.age = ageErr;
    if (selectedConditions.includes('Other') && !otherHealthCondition.trim()) {
      next.otherHealthCondition = 'Please describe your other health condition.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const resolvedConditions = finalizeHealthConditions(selectedConditions, otherHealthCondition);
      const updated: UserProfile = {
        name: name.trim(),
        riskFactors: {
          ...profile!.riskFactors,
          age: Number(age),
          healthConditions: resolvedConditions,
          healthCondition: primaryHealthCondition(resolvedConditions),
        },
      };
      await saveProfile(updated);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      overline="Edit profile"
      title="Health & Safety"
      subtitle="Personalize heat-risk guidance for Tuguegarao"
      back
      horizontalPadding={horizontalPadding}
    >
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, shadow]}
      >
        <View style={styles.heroTop}>
          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{initials || '?'}</Text>
          </LinearGradient>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Preview</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {name.trim() || 'Your name'}
            </Text>
            <Text style={styles.heroMeta}>
              {age ? `${age} years` : 'Age not set'}
              {conditionCount > 0 ? ` · ${conditionCount} condition${conditionCount > 1 ? 's' : ''}` : ' · No conditions'}
            </Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.heroFooterText}>
            Saved on this device and synced when you sign in
          </Text>
        </View>
      </LinearGradient>

      <View style={[styles.sectionCard, shadow]}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="person-outline" size={18} color={palette.primary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>About you</Text>
            <Text style={styles.sectionSubtitle}>Basic details for your risk profile</Text>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.nameField}>
            <FormField label="Full name" required error={errors.name}>
              <TextField
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                autoCapitalize="words"
                icon="person-outline"
                error={!!errors.name}
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
                icon="calendar-outline"
                error={!!errors.age}
              />
            </FormField>
          </View>
        </View>
      </View>

      <View style={[styles.sectionCard, shadow]}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="medical-outline" size={18} color={palette.primary} />
          </View>
          <View style={styles.sectionHeadText}>
            <Text style={styles.sectionTitle}>Health conditions</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply — tap None if not applicable</Text>
          </View>
        </View>

        <View style={styles.conditionGrid}>
          {HEALTH_CONDITION_OPTIONS.map((condition) => {
            const active = selectedConditions.includes(condition);
            const icon = CONDITION_ICONS[condition];
            return (
              <Pressable
                key={condition}
                onPress={() => toggleCondition(condition)}
                style={({ pressed }) => [
                  styles.conditionCard,
                  active && styles.conditionCardActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
              >
                <View style={[styles.conditionIcon, active && styles.conditionIconActive]}>
                  <Ionicons
                    name={icon}
                    size={18}
                    color={active ? '#FFFFFF' : isDark ? palette.textSecondary : palette.primary}
                  />
                </View>
                <Text
                  style={[styles.conditionLabel, active && styles.conditionLabelActive]}
                  numberOfLines={3}
                >
                  {condition}
                </Text>
                {active ? (
                  <View style={styles.conditionCheck}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {selectedConditions.includes('Other') ? (
          <View style={styles.otherField}>
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
          </View>
        ) : null}
      </View>

      <View style={styles.quickSection}>
        <View style={styles.sectionRule}>
          <Text style={styles.sectionRuleLabel}>Quick links</Text>
          <View style={styles.sectionRuleLine} />
        </View>
        <View style={styles.quickGrid}>
          {QUICK_LINKS.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [styles.quickTile, shadow, pressed && styles.pressed]}
            >
              <View style={[styles.quickIcon, { backgroundColor: palette.primarySoft }]}>
                <Ionicons name={item.icon} size={18} color={palette.primary} />
              </View>
              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSub} numberOfLines={1}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.tipCard, { backgroundColor: palette.primarySoft }]}>
        <Ionicons name="information-circle-outline" size={18} color={palette.primary} />
        <Text style={styles.tipText}>
          Conditions help Tify tailor safety tips. They are not a medical diagnosis.
        </Text>
      </View>

      <Button
        label={saving ? 'Saving…' : 'Save changes'}
        onPress={handleSave}
        disabled={saving}
        loading={saving}
        icon="checkmark-circle"
      />
    </Screen>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    heroCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    heroAvatar: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroAvatarText: {
      fontFamily: fonts.headerSemi,
      fontSize: 20,
      color: '#FFFFFF',
    },
    heroText: { flex: 1, minWidth: 0 },
    heroEyebrow: {
      ...typography.overline,
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 2,
    },
    heroName: {
      fontFamily: fonts.headerSemi,
      fontSize: 22,
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    heroMeta: {
      ...typography.bodySm,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 4,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.25)',
    },
    heroFooterText: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.85)',
      flex: 1,
      lineHeight: 17,
    },
    sectionCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeadText: { flex: 1, minWidth: 0 },
    sectionTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 17,
      color: p.text,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: p.textMuted,
      marginTop: 2,
      lineHeight: 17,
    },
    fieldRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    nameField: { flex: 2, minWidth: 0 },
    ageField: { flex: 1, minWidth: 88, maxWidth: 110 },
    conditionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    conditionCard: {
      width: '48.5%',
      minHeight: 96,
      backgroundColor: p.surfaceInset,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: p.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    conditionCardActive: {
      backgroundColor: isDark ? 'rgba(37,99,235,0.22)' : p.primarySoft,
      borderColor: p.primary,
    },
    conditionIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : p.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    conditionIconActive: {
      backgroundColor: p.primary,
    },
    conditionLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: p.text,
      lineHeight: 16,
      flex: 1,
    },
    conditionLabelActive: {
      color: isDark ? '#FFFFFF' : p.primary,
    },
    conditionCheck: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otherField: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: p.border,
    },
    quickSection: { marginBottom: spacing.lg },
    sectionRule: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    sectionRuleLabel: {
      ...typography.overline,
      color: p.textMuted,
    },
    sectionRuleLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.border,
    },
    quickGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    quickTile: {
      flex: 1,
      backgroundColor: p.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.md,
      gap: 4,
      minWidth: 0,
    },
    quickIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    quickTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: p.text,
    },
    quickSub: {
      ...typography.caption,
      color: p.textMuted,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    tipText: {
      ...typography.caption,
      color: p.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    pressed: { opacity: 0.88 },
  });
}
