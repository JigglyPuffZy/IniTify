import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface ScreenContainerProps {
  children: React.ReactNode;
  title?: string;
}

export function ScreenContainer({ children, title }: ScreenContainerProps) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#006AB1" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>Error</Text>
      <Text style={styles.errorMessage}>{message}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export function InfoBanner({
  message,
  variant = 'info',
}: {
  message: string;
  variant?: 'info' | 'warning' | 'cached' | 'emergency';
}) {
  const bg =
    variant === 'emergency'
      ? '#fef2f2'
      : variant === 'warning'
        ? '#fffbeb'
        : variant === 'cached'
          ? '#eff6ff'
          : '#f0fdf4';
  const border =
    variant === 'emergency'
      ? '#ef4444'
      : variant === 'warning'
        ? '#eab308'
        : variant === 'cached'
          ? '#006AB1'
          : '#22c55e';

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderLeftColor: border }]}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f1d1d',
  },
  banner: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  bannerText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
});
