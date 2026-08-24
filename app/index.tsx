import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { BrandMark } from '@/src/components/auth/BrandMark';
import { Button } from '@/src/components/UiComponents';
import { LoadingState } from '@/src/components/ScreenContainer';
import { isProfileComplete } from '@/src/utils/profile-storage';
import { layout, radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { LegacyThemeColors } from '@/src/theme/legacy-colors';

const highlights = [
  {
    icon: 'thermometer' as const,
    title: 'Heat risk check',
    text: 'Personalized risk from live weather and your profile',
  },
  {
    icon: 'partly-sunny' as const,
    title: 'Live weather',
    text: 'Temperature, conditions, and heat index for Tuguegarao',
  },
  {
    icon: 'medkit' as const,
    title: 'Emergency support',
    text: 'Hotlines, first aid, and hospital directions',
  },
];

export default function EntryScreen() {
  const router = useRouter();
  const { user, usesSupabase, isLoading: authLoading } = useAuth();
  const { profile, isLoading, profileRestoredFromCloud } = useIniTify();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (authLoading) {
    return <LoadingState message="Checking your account…" />;
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (isLoading) {
    return <LoadingState message="Loading your account profile…" />;
  }
  if (isProfileComplete(profile)) return <Redirect href="/(tabs)/home" />;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <BrandMark size={88} style={styles.logo} />
          <Text style={styles.overline}>Heat safety · Tuguegarao City</Text>
          <Text style={styles.title}>Welcome, {user.displayName ?? 'there'}</Text>
          {user.email ? <Text style={styles.accountEmail}>{user.email}</Text> : null}
          <Text style={styles.tagline}>
            {usesSupabase
              ? 'Set up your health profile once — it saves to your account and follows you on any phone when you sign in.'
              : 'Complete your health profile so IniTify can personalize heat-risk guidance for you.'}
          </Text>
          {profileRestoredFromCloud ? (
            <Text style={styles.syncNote}>Profile synced from your account.</Text>
          ) : null}
        </View>

        <View style={styles.highlights}>
          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightRow}>
              <View style={styles.highlightIcon}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.highlightText}>
                <Text style={styles.highlightTitle}>{item.title}</Text>
                <Text style={styles.highlightBody}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button label="Complete profile" icon="arrow-forward" onPress={() => router.push('/setup')} />
        <Text style={styles.footerNote}>Takes about 2 minutes · Free for Tuguegarao City</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: LegacyThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: layout.pagePadding,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.xxl,
    },
    hero: { gap: spacing.sm },
    logo: {
      marginBottom: spacing.md,
    },
    overline: { ...typography.overline, color: colors.textMuted },
    title: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -1,
    },
    tagline: {
      ...typography.body,
      color: colors.textSecondary,
      maxWidth: 360,
      marginTop: spacing.xs,
      lineHeight: 22,
    },
    accountEmail: {
      ...typography.bodySm,
      color: colors.primary,
      fontWeight: '600',
    },
    syncNote: {
      ...typography.caption,
      color: colors.success,
      marginTop: spacing.xs,
    },
    highlights: { gap: spacing.lg },
    highlightRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    highlightIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightText: { flex: 1 },
    highlightTitle: { ...typography.h3, color: colors.text },
    highlightBody: { ...typography.caption, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
    footer: { gap: spacing.lg, paddingBottom: spacing.lg },
    footerNote: { ...typography.caption, color: colors.textLight, textAlign: 'center' },
  });
}
