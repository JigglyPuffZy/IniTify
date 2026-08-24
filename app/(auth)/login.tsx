import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import {
  AuthField,
  AuthMessageBanner,
  AuthScreenLayout,
} from '@/src/components/auth/AuthScreenLayout';
import {
  AuthGradientButton,
  AuthOrDivider,
  AuthSoftButton,
} from '@/src/components/auth/AuthButtons';
import { LoadingState } from '@/src/components/ScreenContainer';
import { validateEmail, validatePassword } from '@/src/utils/validation';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { spacing, typography } from '@/src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, usesSupabase, isLoading: authLoading } = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (emailErr) next.email = emailErr;
    if (passwordErr) next.password = passwordErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignIn() {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <LoadingState message="Loading sign in…" />;
  }

  return (
    <AuthScreenLayout
      variant="login"
      title="Welcome back"
      subtitle="Heat-risk alerts and safety tools for Tuguegarao City."
    >
      <AuthField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry={!showPassword}
        onToggleSecure={() => setShowPassword((v) => !v)}
        error={errors.password}
        returnKeyType="go"
        onSubmitEditing={() => void handleSignIn()}
      />

      {message ? <AuthMessageBanner message={message} /> : null}

      <View style={styles.actions}>
        <AuthGradientButton label="Sign in" onPress={handleSignIn} loading={loading} />
        <AuthOrDivider />
        <AuthSoftButton
          label="Create account"
          icon="person-add-outline"
          onPress={() => router.push('/(auth)/signup')}
        />
      </View>

      {!usesSupabase ? (
        <View style={styles.deviceNote}>
          <Ionicons name="phone-portrait-outline" size={16} color={palette.textMuted} />
          <Text style={styles.noteText}>
            Device mode — accounts stay on this phone until Supabase is connected.
          </Text>
        </View>
      ) : null}
    </AuthScreenLayout>
  );
}

function createStyles(p: ReturnType<typeof useAppTheme>['palette']) {
  return StyleSheet.create({
    actions: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    deviceNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    noteText: {
      ...typography.caption,
      flex: 1,
      color: p.textMuted,
      lineHeight: 18,
    },
  });
}
