import { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from './BrandMark';
import { authHeroGradientDark, brand, splashGradient } from './auth-brand';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { fonts, layout, radius, spacing, typography } from '@/src/theme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AuthScreenLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  back?: boolean;
  /** Login uses a centered welcome layout; signup keeps a compact header */
  variant?: 'login' | 'signup';
  headerExtra?: React.ReactNode;
}

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  footer,
  back,
  variant = 'signup',
  headerExtra,
}: AuthScreenLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, variant), [palette, variant]);
  const isLogin = variant === 'login';

  const gradient = isDark ? authHeroGradientDark : splashGradient;

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
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              {
                paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.md,
              },
            ]}
          >
            <View style={styles.topBar}>
              {back ? (
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={20} color={brand.onDark} />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
            </View>

            <View style={[styles.header, isLogin && styles.headerLogin]}>
              <BrandMark size={isLogin ? 120 : 108} />
              <View style={styles.headerCopy}>
                <Text style={[styles.title, isLogin && styles.titleLogin]}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              {headerExtra}
            </View>

            <GlassSurface
              variant="card"
              isDark={isDark}
              palette={palette}
              borderRadius={radius.xxl}
              intensity={isDark ? 40 : 55}
              style={styles.formShell}
              contentStyle={styles.formContent}
            >
              {children}
            </GlassSurface>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  secureTextEntry,
  onToggleSecure,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon: IconName;
  error?: string;
  secureTextEntry?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  onSubmitEditing?: () => void;
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createFieldStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <Ionicons
          name={icon}
          size={18}
          color={error ? palette.danger : isDark ? brand.blueSoft : brand.blue}
          style={styles.leadingIcon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.45)' : palette.textLight}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
        {onToggleSecure ? (
          <Pressable onPress={onToggleSecure} hitSlop={8} accessibilityRole="button">
            <Ionicons
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={isDark ? 'rgba(255,255,255,0.55)' : palette.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function AuthMessageBanner({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'success';
}) {
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createBannerStyles(palette, isDark, tone), [palette, isDark, tone]);

  return (
    <View style={styles.banner}>
      <Ionicons
        name={tone === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={18}
        color={tone === 'success' ? palette.success : palette.danger}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(p: AppPalette, variant: 'login' | 'signup') {
  const isLogin = variant === 'login';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: brand.navyDeep,
    },
    flex: { flex: 1 },
    safe: { flex: 1 },
    glowTop: {
      position: 'absolute',
      top: -80,
      right: -60,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    glowBottom: {
      position: 'absolute',
      bottom: 120,
      left: -90,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: 'rgba(96,165,250,0.12)',
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: layout.pagePadding,
      gap: spacing.xl,
    },
    topBar: {
      minHeight: 44,
      justifyContent: 'center',
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: radius.pill,
      backgroundColor: brand.glass,
      borderWidth: 1,
      borderColor: brand.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backPlaceholder: {
      width: 42,
      height: 42,
    },
    header: {
      alignItems: 'center',
      gap: spacing.lg,
      paddingTop: spacing.xs,
    },
    headerLogin: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    headerCopy: {
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 340,
    },
    overline: {
      ...typography.overline,
      color: brand.onDarkFaint,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: fonts.header,
      fontSize: 28,
      color: brand.onDark,
      letterSpacing: -0.6,
      lineHeight: 34,
      textAlign: 'center',
    },
    titleLogin: {
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.8,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: brand.onDarkMuted,
      textAlign: 'center',
    },
    formShell: {
      width: '100%',
    },
    formContent: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    footer: {
      alignItems: 'center',
      paddingTop: isLogin ? spacing.sm : 0,
      width: '100%',
    },
    pressed: { opacity: 0.82 },
  });
}

function createFieldStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    field: { gap: spacing.sm },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: isDark ? brand.onDark : p.text,
      letterSpacing: 0.2,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(37,99,235,0.12)',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      minHeight: 56,
    },
    inputWrapError: {
      borderColor: p.danger,
      backgroundColor: isDark ? 'rgba(37,99,235,0.18)' : p.dangerSoft,
    },
    leadingIcon: {
      width: 22,
      textAlign: 'center',
    },
    input: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 16,
      color: isDark ? brand.onDark : p.text,
      paddingVertical: spacing.md,
    },
    error: {
      ...typography.caption,
      color: isDark ? brand.blueSoft : p.danger,
    },
  });
}

function createBannerStyles(p: AppPalette, isDark: boolean, tone: 'error' | 'success') {
  const isSuccess = tone === 'success';

  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: isSuccess
        ? isDark
          ? 'rgba(96,165,250,0.16)'
          : p.successSoft
        : isDark
          ? 'rgba(37,99,235,0.2)'
          : p.dangerSoft,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: isSuccess
        ? isDark
          ? 'rgba(96,165,250,0.35)'
          : 'rgba(96,165,250,0.35)'
        : isDark
          ? 'rgba(96,165,250,0.3)'
          : p.border,
    },
    text: {
      ...typography.bodySm,
      flex: 1,
      color: isDark ? brand.onDark : p.text,
      lineHeight: 20,
    },
  });
}
