import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import {
  AuthField,
  AuthMessageBanner,
  AuthScreenLayout,
} from '@/src/components/auth/AuthScreenLayout';
import { AuthGradientButton, AuthOrDivider, AuthSoftButton } from '@/src/components/auth/AuthButtons';
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '@/src/utils/validation';
import { useAppTheme } from '@/src/theme/useAppTheme';
import { spacing, typography } from '@/src/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, usesSupabase } = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    const nameErr = validateRequired(name, 'Name');
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (nameErr) next.name = nameErr;
    if (emailErr) next.email = emailErr;
    if (passwordErr) next.password = passwordErr;
    if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSignUp() {
    setMessage(null);
    setSuccess(false);
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, name.trim());
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      if (result.needsEmailConfirm) {
        setSuccess(true);
        setMessage(result.message);
        return;
      }
      router.replace('/setup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      variant="signup"
      back
      title="Create account"
      subtitle="Set up your profile to receive heat-risk alerts tailored to Tuguegarao City."
    >
      <AuthField
        label="Full name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="How should we address you?"
        autoCapitalize="words"
        error={errors.name}
      />
      <AuthField
        label="Email address"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimum 6 characters"
        secureTextEntry={!showPassword}
        onToggleSecure={() => setShowPassword((v) => !v)}
        error={errors.password}
      />
      <AuthField
        label="Confirm password"
        icon="shield-checkmark-outline"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter your password"
        secureTextEntry={!showPassword}
        error={errors.confirmPassword}
      />

      {message ? (
        <AuthMessageBanner message={message} tone={success ? 'success' : 'error'} />
      ) : null}

      <View style={styles.actions}>
        <AuthGradientButton
          label={success ? 'Return to sign in' : 'Create account'}
          icon={success ? 'arrow-back-outline' : 'person-add-outline'}
          onPress={success ? () => router.replace('/(auth)/login') : handleSignUp}
          loading={loading}
        />

        {!success ? (
          <>
            <AuthOrDivider />
            <AuthSoftButton
              label="Sign in instead"
              icon="log-in-outline"
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        ) : null}
      </View>

      {!usesSupabase ? (
        <Text style={styles.note}>
          Device mode is active. Your account will be saved on this phone for demo use.
        </Text>
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
    note: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
