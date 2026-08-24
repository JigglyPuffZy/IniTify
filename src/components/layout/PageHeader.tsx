import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { layout, spacing, typography } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

export type PageHeaderTint = 'default' | 'emergency' | 'brand';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  tint?: PageHeaderTint;
  action?: React.ReactNode;
  horizontalPadding?: number;
}

export function PageHeader({
  title,
  subtitle,
  tint = 'default',
  action,
  horizontalPadding = layout.pagePadding,
}: PageHeaderProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const bg =
    tint === 'emergency' ? palette.primarySoft : palette.surface;

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <View style={[styles.accentBar, { backgroundColor: palette.primary }]} />
      <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.textBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

function createStyles(p: AppPalette) {
  return StyleSheet.create({
    wrap: {
      borderBottomWidth: 1,
      borderBottomColor: p.borderLight,
    },
    accentBar: {
      height: 3,
      width: '100%',
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...typography.h1,
      color: p.text,
    },
    subtitle: {
      ...typography.bodySm,
      color: p.textMuted,
      marginTop: spacing.xs,
    },
    action: {
      flexShrink: 0,
    },
  });
}
