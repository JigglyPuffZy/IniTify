import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, surfaceShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface MenuItem {
  title: string;
  description?: string;
  href: string;
  icon: IconName;
  iconColor?: string;
  iconBg?: string;
}

export function MenuSection({
  title,
  items,
  seeAllHref,
  seeAllLabel = 'See all',
}: {
  title: string;
  items: MenuItem[];
  seeAllHref?: string;
  seeAllLabel?: string;
}) {
  const router = useRouter();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {seeAllHref ? (
          <Pressable
            onPress={() => router.push(seeAllHref as never)}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Text style={styles.seeAllText}>{seeAllLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color={palette.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.group}>
        {items.map((item, index) => (
          <View key={item.href}>
            <MenuRow item={item} styles={styles} palette={palette} />
            {index < items.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function getIconPalette(p: AppPalette): Record<string, { bg: string; fg: string }> {
  return {
    'create-outline': { bg: p.primarySoft, fg: p.primary },
    'speedometer-outline': { bg: p.primarySoft, fg: p.primary },
    'heart-outline': { bg: p.primarySoft, fg: p.primary },
    'medkit-outline': { bg: p.primarySoft, fg: p.primary },
    'notifications-outline': { bg: p.primarySoft, fg: p.primary },
    'bookmark-outline': { bg: p.primarySoft, fg: p.primary },
    'moon-outline': { bg: p.primarySoft, fg: p.primary },
    default: { bg: p.primarySoft, fg: p.primary },
  };
}

function MenuRow({
  item,
  styles,
  palette,
}: {
  item: MenuItem;
  styles: ReturnType<typeof createStyles>;
  palette: AppPalette;
}) {
  const router = useRouter();
  const iconPalette = getIconPalette(palette);
  const colors = iconPalette[item.icon] ?? iconPalette.default;
  const iconBg = item.iconBg ?? colors.bg;
  const iconFg = item.iconColor ?? colors.fg;

  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={item.icon} size={22} color={iconFg} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.rowDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.textLight} style={styles.chevron} />
      </View>
    </Pressable>
  );
}

const ICON_OFFSET = 44 + spacing.lg + spacing.md;

function createStyles(p: AppPalette, isDark: boolean) {
  return StyleSheet.create({
    section: { gap: spacing.md },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    sectionTitle: {
      ...typography.h2,
      color: p.text,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingLeft: spacing.sm,
    },
    seeAllText: {
      ...typography.caption,
      fontWeight: '600',
      color: p.textMuted,
    },
    group: {
      backgroundColor: p.surface,
      borderRadius: radius.xl,
      overflow: 'hidden',
      width: '100%',
      borderWidth: 1,
      borderColor: p.border,
      ...surfaceShadow(isDark),
    },
    rowPressable: { width: '100%' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 72,
    },
    rowPressed: { backgroundColor: p.surfaceMuted },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginRight: spacing.md,
    },
    rowText: { flex: 1, flexShrink: 1, minWidth: 0, marginRight: spacing.md },
    rowTitle: {
      ...typography.label,
      fontSize: 15,
      color: p.text,
      letterSpacing: -0.15,
    },
    rowDesc: {
      ...typography.caption,
      color: p.textSecondary,
      lineHeight: 17,
      marginTop: 3,
    },
    chevron: { flexShrink: 0 },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: p.borderLight,
      marginLeft: ICON_OFFSET,
      marginRight: spacing.lg,
    },
    pressed: { opacity: 0.75 },
  });
}
