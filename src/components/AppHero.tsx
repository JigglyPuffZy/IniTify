import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradients, radius, spacing, typography } from '@/src/theme';

interface ProfileHeroProps {
  name: string;
  subtitle: string;
  initial: string;
  horizontalPadding: number;
}

export function ProfileHero({ name, subtitle, initial, horizontalPadding }: ProfileHeroProps) {
  return (
    <LinearGradient colors={[...gradients.hero]} style={styles.hero}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.avatarRing}>
            <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']} style={styles.avatar}>
              <Text style={styles.initial}>{initial}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

interface HomeHeroProps {
  greeting: string;
  title: string;
  subtitle: string;
  initial: string;
  horizontalPadding: number;
  onProfilePress: () => void;
}

export function HomeHero({
  greeting,
  title,
  subtitle,
  initial,
  horizontalPadding,
  onProfilePress,
}: HomeHeroProps) {
  return (
    <LinearGradient colors={[...gradients.hero]} style={styles.hero}>
      <SafeAreaView edges={['top']}>
        <View style={[styles.homeRow, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.homeText}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.homeTitle}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onProfilePress} style={styles.avatarRing}>
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.08)']}
              style={styles.avatarSm}
            >
              <Text style={styles.initialSm}>{initial}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: spacing.xxxl,
  },
  inner: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSm: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.white,
  },
  initialSm: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.4,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  homeText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
  },
});
