import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, surfaceShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface QuickAccessItem {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  iconColor: string;
  iconBg: string;
}

interface QuickAccessListProps {
  title?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  items: QuickAccessItem[];
}

export function QuickAccessList({
  title = 'Quick access',
  seeAllHref = '/profile',
  seeAllLabel = 'See all',
  items,
}: QuickAccessListProps) {
  const router = useRouter();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        {seeAllHref ? (
          <Pressable
            onPress={() => router.push(seeAllHref as never)}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>{seeAllLabel}</Text>
            <Ionicons name="chevron-forward" size={13} color={palette.textLight} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={item.href} style={styles.rowShell}>
            <QuickAccessRow item={item} styles={styles} chevronColor={palette.textLight} />
            {index < items.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function QuickAccessRow({
  item,
  styles,
  chevronColor,
}: {
  item: QuickAccessItem;
  styles: ReturnType<typeof createStyles>;
  chevronColor: string;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={21} color={item.iconColor} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowDesc} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons name="chevron-forward" size={14} color={chevronColor} />
        </View>
      </View>
    </Pressable>
  );
}

const ICON_OFFSET = 48 + spacing.lg + spacing.md;

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    section: { gap: spacing.md },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerTitle: {
      ...typography.h2,
      fontSize: 20,
      color: p.text,
      letterSpacing: -0.4,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
      paddingVertical: 4,
      paddingLeft: spacing.sm,
    },
    seeAllText: {
      fontSize: 13,
      fontWeight: '600',
      color: p.textMuted,
    },
    card: {
      backgroundColor: p.surface,
      borderRadius: radius.xxl,
      overflow: 'hidden',
      width: '100%',
      borderWidth: 1,
      borderColor: p.border,
      ...surfaceShadow(isDark),
    },
    rowShell: { width: '100%' },
    rowPressable: { width: '100%' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      paddingVertical: 18,
      paddingHorizontal: spacing.lg,
      minHeight: 76,
    },
    rowPressed: { backgroundColor: p.surfaceMuted },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginRight: spacing.md,
    },
    rowText: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
      marginRight: spacing.md,
    },
    rowTitle: {
      ...typography.label,
      fontSize: 15,
      color: p.text,
      letterSpacing: -0.2,
    },
    rowDesc: {
      ...typography.caption,
      color: p.textSecondary,
      lineHeight: 18,
      marginTop: 4,
    },
    chevronCircle: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: p.surfaceInset,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.borderLight,
      marginLeft: ICON_OFFSET,
      marginRight: spacing.lg,
    },
    pressed: { opacity: 0.8 },
  });
}
