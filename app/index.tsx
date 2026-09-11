import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { BrandMark } from '@/src/components/auth/BrandMark';
import { AuthGradientButton } from '@/src/components/auth/AuthButtons';
import { authHeroGradientDark, brand, splashGradient } from '@/src/components/auth/auth-brand';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { LoadingState } from '@/src/components/ScreenContainer';
import { isProfileComplete } from '@/src/utils/profile-storage';
import { fonts, layout, radius, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';

const FEATURES = [
  {
    icon: 'thermometer-outline' as const,
    title: 'Heat risk',
    text: 'Personal guidance from live weather and your health profile',
  },
  {
    icon: 'partly-sunny-outline' as const,
    title: 'Live weather',
    text: 'Temperature and heat index for Tuguegarao City',
  },
  {
    icon: 'chatbubble-ellipses-outline' as const,
    title: 'Tify check-ins',
    text: 'Quick daily chats to track hydration and how you feel',
  },
  {
    icon: 'medkit-outline' as const,
    title: 'Emergency help',
    text: 'Hotlines, first aid, and nearest hospitals',
  },
];

export default function EntryScreen() {
  const router = useRouter();
  const { user, usesSupabase, isLoading: authLoading } = useAuth();
  const { profile, isLoading, profileRestoredFromCloud } = useIniTify();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const gradient = isDark ? authHeroGradientDark : splashGradient;
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  if (authLoading) {
    return <LoadingState message="Checking your account…" />;
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  if (isLoading) {
    return <LoadingState message="Loading your profile…" />;
  }
  if (isProfileComplete(profile)) return <Redirect href="/(tabs)/home" />;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <BrandMark size={96} />
            <Text style={styles.overline}>IniTify · Tuguegarao City</Text>
            <Text style={styles.title}>Welcome, {firstName}</Text>
            {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
            <Text style={styles.lead}>
              {usesSupabase
                ? 'Set up your profile once. It saves to your account and syncs when you sign in.'
                : 'A short setup helps IniTify personalize heat safety for you.'}
            </Text>
            {profileRestoredFromCloud ? (
              <View style={styles.syncPill}>
                <Ionicons name="cloud-done-outline" size={14} color={brand.blueSoft} />
                <Text style={styles.syncText}>Profile synced from your account</Text>
              </View>
            ) : null}
          </View>

          <GlassSurface
            variant="card"
            isDark={isDark}
            palette={palette}
            borderRadius={radius.xxl}
            intensity={isDark ? 36 : 50}
            style={styles.featuresShell}
            contentStyle={styles.featuresContent}
          >
            <Text style={styles.featuresTitle}>What you get</Text>
            {FEATURES.map((item, index) => (
              <View
                key={item.title}
                style={[styles.featureRow, index < FEATURES.length - 1 && styles.featureRowBorder]}
              >
                <View style={styles.featureIcon}>
                  <Ionicons name={item.icon} size={20} color={brand.blueSoft} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureBody}>{item.text}</Text>
                </View>
              </View>
            ))}
          </GlassSurface>
        </ScrollView>

        <View style={styles.footer}>
          <AuthGradientButton
            label="Get started"
            icon="arrow-forward"
            onPress={() => router.push('/setup')}
          />
          <Text style={styles.footerNote}>About 2 minutes · Free for Tuguegarao</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: brand.navyDeep,
    },
    safe: {
      flex: 1,
    },
    glowTop: {
      position: 'absolute',
      top: -60,
      right: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: 80,
      left: -70,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: 'rgba(96,165,250,0.14)',
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: layout.pagePadding,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      gap: spacing.xl,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    overline: {
      ...typography.overline,
      color: brand.onDarkFaint,
      letterSpacing: 1.5,
      marginTop: spacing.md,
    },
    title: {
      fontFamily: fonts.header,
      fontSize: 32,
      fontWeight: '800',
      color: brand.onDark,
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    email: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: brand.blueSoft,
    },
    lead: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: brand.onDarkMuted,
      textAlign: 'center',
      maxWidth: 340,
      marginTop: spacing.xs,
    },
    syncPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.12)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.2)',
    },
    syncText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: brand.onDarkMuted,
    },
    featuresShell: {
      width: '100%',
    },
    featuresContent: {
      padding: spacing.lg,
      gap: 0,
    },
    featuresTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: brand.onDarkFaint,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    featureRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureCopy: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: brand.onDark,
    },
    featureBody: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      color: brand.onDarkMuted,
    },
    footer: {
      paddingHorizontal: layout.pagePadding,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    footerNote: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: brand.onDarkFaint,
      textAlign: 'center',
    },
  });
}
