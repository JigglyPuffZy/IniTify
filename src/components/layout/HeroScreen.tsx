import { useMemo } from 'react';

import {

  ScrollView,

  StyleSheet,

  View,

  Text,

  Pressable,

  type RefreshControlProps,

} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';

import { layout, radius, spacing, typography } from '@/src/theme';

import { useAppTheme } from '@/src/theme/useAppTheme';

import type { AppPalette } from '@/src/theme/palettes';



type IconName = React.ComponentProps<typeof Ionicons>['name'];



interface HeroScreenProps {

  gradient: readonly string[];

  overline?: string;

  title: string;

  subtitle?: string;

  back?: boolean;

  onBackPress?: () => void;

  heroContent?: React.ReactNode;

  action?: { icon?: IconName; label?: string; initial?: string; onPress: () => void };

  children: React.ReactNode;

  horizontalPadding?: number;

  refreshControl?: React.ReactElement<RefreshControlProps>;

  overlap?: boolean;

  compact?: boolean;

}



export function HeroScreen({

  gradient,

  overline,

  title,

  subtitle,

  back = false,

  onBackPress,

  heroContent,

  action,

  children,

  horizontalPadding = layout.pagePadding,

  refreshControl,

  overlap = true,

  compact = false,

}: HeroScreenProps) {

  const router = useRouter();

  const { palette } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);



  function handleBack() {

    if (onBackPress) {

      onBackPress();

      return;

    }

    if (router.canGoBack()) {

      router.back();

    } else {

      router.replace('/(tabs)/home');

    }

  }



  return (

    <View style={styles.root}>

      <LinearGradient

        colors={gradient as [string, string, ...string[]]}

        start={{ x: 0, y: 0 }}

        end={{ x: 1, y: 1 }}

        style={[styles.hero, compact && styles.heroCompact]}

      >

        <View style={styles.orbTop} />

        <View style={styles.orbBottom} />

        <SafeAreaView edges={['top']}>

          <View style={[styles.heroInner, { paddingHorizontal: horizontalPadding }]}>

            {back ? (

              <Pressable

                onPress={handleBack}

                style={({ pressed }) => [styles.back, pressed && styles.actionPressed]}

                accessibilityRole="button"

                accessibilityLabel="Go back"

                hitSlop={8}

              >

                <Ionicons name="chevron-back" size={18} color={palette.onHero} />

                <Text style={styles.backText}>Back</Text>

              </Pressable>

            ) : null}

            <View style={styles.heroTopRow}>

              <View style={styles.heroText}>

                {overline ? <Text style={styles.overline}>{overline}</Text> : null}

                <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">

                  {title}

                </Text>

                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

              </View>

              {action ? (

                <Pressable

                  onPress={action.onPress}

                  style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}

                  accessibilityRole="button"

                  accessibilityLabel={action.label ?? 'Screen action'}

                >

                  {action.initial ? (

                    <Text style={styles.actionInitial}>{action.initial}</Text>

                  ) : (

                    <Ionicons name={action.icon ?? 'person'} size={20} color={palette.onHero} />

                  )}

                </Pressable>

              ) : null}

            </View>

            {heroContent ? <View style={styles.heroContent}>{heroContent}</View> : null}

          </View>

        </SafeAreaView>

      </LinearGradient>



      <View style={styles.sheet}>

        <ScrollView

          showsVerticalScrollIndicator={false}

          contentContainerStyle={styles.scrollContent}

          keyboardShouldPersistTaps="handled"

          refreshControl={refreshControl}

        >

          <View

            style={[

              styles.content,

              { paddingHorizontal: horizontalPadding },

              overlap && styles.contentOverlap,

            ]}

          >

            {children}

          </View>

        </ScrollView>

      </View>

    </View>

  );

}



function createStyles(p: AppPalette) {

  return StyleSheet.create({

    root: {

      flex: 1,

      backgroundColor: p.heroGradient[0],

    },

    hero: {

      paddingBottom: spacing.xxl,

      overflow: 'hidden',

    },

    heroCompact: {

      paddingBottom: spacing.lg,

    },

    orbTop: {

      position: 'absolute',

      top: -70,

      right: -50,

      width: 190,

      height: 190,

      borderRadius: radius.pill,

      backgroundColor: 'rgba(255,255,255,0.10)',

    },

    orbBottom: {

      position: 'absolute',

      bottom: -90,

      left: -60,

      width: 200,

      height: 200,

      borderRadius: radius.pill,

      backgroundColor: 'rgba(255,255,255,0.07)',

    },

    heroInner: {

      paddingTop: spacing.md,

    },

    back: {

      flexDirection: 'row',

      alignItems: 'center',

      alignSelf: 'flex-start',

      gap: 2,

      paddingVertical: 6,

      paddingRight: spacing.md,

      marginBottom: spacing.sm,

    },

    backText: { ...typography.label, color: p.onHero },

    heroTopRow: {

      flexDirection: 'row',

      alignItems: 'flex-start',

      justifyContent: 'space-between',

      gap: spacing.md,

    },

    heroText: { flex: 1, minWidth: 0 },

    overline: {

      ...typography.overline,

      color: p.onHeroMuted,

      marginBottom: 6,

    },

    title: {

      ...typography.hero,

      color: p.onHero,

    },

    titleCompact: {

      fontSize: 24,

      letterSpacing: -0.4,

    },

    subtitle: {

      ...typography.bodySm,

      color: p.onHeroMuted,

      marginTop: 6,

    },

    heroContent: {

      marginTop: spacing.xl,

    },

    action: {

      width: 44,

      height: 44,

      borderRadius: radius.pill,

      backgroundColor: p.glass.overlay,

      borderWidth: 1,

      borderColor: p.glass.border,

      alignItems: 'center',

      justifyContent: 'center',

      flexShrink: 0,

    },

    actionPressed: { opacity: 0.75 },

    actionInitial: {

      fontSize: 17,

      fontWeight: '800',

      color: p.onHero,

    },

    sheet: {

      flex: 1,

      marginTop: -layout.heroCurve,

      backgroundColor: p.background,

      borderTopLeftRadius: layout.heroCurve,

      borderTopRightRadius: layout.heroCurve,

      overflow: 'hidden',

    },

    scrollContent: {

      paddingBottom: spacing.huge,

    },

    content: {

      paddingTop: spacing.xl,

      paddingBottom: spacing.xl,

      gap: layout.sectionGap,

    },

    contentOverlap: {

      paddingTop: spacing.lg,

    },

  });

}


