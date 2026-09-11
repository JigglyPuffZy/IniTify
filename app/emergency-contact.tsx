import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/UiComponents';
import { FormField, TextField, FormSection } from '@/src/components/FormField';
import { useResponsive } from '@/src/utils/responsive';
import { validateRequired } from '@/src/utils/validation';
import { spacing, radius, typography, fonts, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) return 'Enter a valid phone number (at least 10 digits).';
  return null;
}

export default function EmergencyContactScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, emergencyContact, saveEmergencyContact } = useIniTify();
  const { horizontalPadding } = useResponsive();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);
  const shadow = useMemo(() => cardShadow(), []);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (emergencyContact) {
      setContactName(emergencyContact.name);
      setContactPhone(emergencyContact.phone);
    }
  }, [emergencyContact]);

  if (!user) return <Redirect href="/(auth)/login" />;
  if (!profile) return <Redirect href="/" />;

  async function handleSave() {
    const next: Record<string, string> = {};
    const nameErr = validateRequired(contactName, 'Contact name');
    if (nameErr) next.contactName = nameErr;
    const phoneErr = validatePhone(contactPhone);
    if (phoneErr) next.contactPhone = phoneErr;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await saveEmergencyContact({
        name: contactName.trim(),
        phone: contactPhone.trim(),
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/emergency');
      }
    } finally {
      setSaving(false);
    }
  }

  const hasContact = Boolean(emergencyContact?.phone);

  return (
    <Screen
      title="Emergency contact"
      subtitle="Someone IniTify can call or text in a heat emergency"
      back
      onBackPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/emergency');
      }}
      horizontalPadding={horizontalPadding}
    >
      <LinearGradient
        colors={isDark ? ['#991B1B', '#DC2626'] : ['#DC2626', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, shadow]}
      >
        <View style={styles.heroIconWrap}>
          <Ionicons name="call" size={28} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>
          {hasContact ? 'Your emergency contact' : 'Add someone you trust'}
        </Text>
        <Text style={styles.heroSub}>
          {hasContact
            ? `${emergencyContact!.name} · ${emergencyContact!.phone}`
            : 'They will receive a pre-filled SMS when you tap Text on the Emergency tab.'}
        </Text>
      </LinearGradient>

      <View style={[styles.formCard, shadow]}>
        <FormSection
          title="Contact details"
          description="Saved on this device and synced when you sign in"
          icon="person-outline"
        >
          <FormField label="Name" required error={errors.contactName}>
            <TextField
              value={contactName}
              onChangeText={setContactName}
              placeholder="e.g. Maria Santos"
              autoCapitalize="words"
              icon="person-outline"
              error={!!errors.contactName}
            />
          </FormField>

          <FormField label="Phone" required error={errors.contactPhone}>
            <TextField
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="09xx xxx xxxx"
              keyboardType="phone-pad"
              icon="call-outline"
              error={!!errors.contactPhone}
            />
          </FormField>
        </FormSection>
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={20} color={palette.primary} />
        <Text style={styles.tipText}>
          IniTify opens Messages with a heat-safety alert. You tap Send to deliver it — we never
          send SMS without your confirmation.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label={saving ? 'Saving…' : hasContact ? 'Save changes' : 'Save contact'}
          onPress={() => void handleSave()}
          disabled={saving}
          loading={saving}
          icon="checkmark"
        />
        {hasContact ? (
          <Pressable
            onPress={() => router.replace('/(tabs)/emergency')}
            style={({ pressed }) => [styles.secondaryLink, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLinkText}>Back to Emergency tab</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    heroCard: {
      borderRadius: radius.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    heroIconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    heroTitle: {
      fontFamily: fonts.headerSemi,
      fontSize: 18,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    heroSub: {
      ...typography.bodySm,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      lineHeight: 20,
    },
    formCard: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: p.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.12)',
      marginBottom: spacing.xl,
    },
    tipText: {
      ...typography.bodySm,
      color: p.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    actions: {
      gap: spacing.md,
    },
    secondaryLink: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    secondaryLinkText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: p.primary,
    },
    pressed: { opacity: 0.88 },
  });
}
