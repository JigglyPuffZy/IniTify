import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';

interface NavCardProps {
  title: string;
  description: string;
  href: string;
  variant?: 'default' | 'danger';
}

export function NavCard({ title, description, href, variant = 'default' }: NavCardProps) {
  return (
    <Link href={href as never} asChild>
      <Pressable
        style={[styles.card, variant === 'danger' && styles.dangerCard]}
      >
        <Text style={[styles.title, variant === 'danger' && styles.dangerTitle]}>
          {title}
        </Text>
        <Text style={styles.description}>{description}</Text>
      </Pressable>
    </Link>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'danger' && styles.dangerButton,
        variant === 'secondary' && styles.secondaryButton,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface RecommendationCardProps {
  title: string;
  description: string;
}

export function RecommendationCard({ title, description }: RecommendationCardProps) {
  return (
    <View style={styles.recCard}>
      <Text style={styles.recTitle}>{title}</Text>
      <Text style={styles.recDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dangerCard: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  dangerTitle: {
    color: '#991b1b',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#006AB1',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 8,
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#006AB1',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#006AB1',
  },
  recCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#33AF41',
  },
  recTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
});
