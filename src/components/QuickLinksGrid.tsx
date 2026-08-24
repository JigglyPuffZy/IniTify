import { useMemo } from 'react';

import { View, Text, StyleSheet, Pressable } from 'react-native';

import { Link } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';

import { radius, spacing, typography } from '@/src/theme';

import { useAppTheme } from '@/src/theme/useAppTheme';

import type { AppPalette } from '@/src/theme/palettes';



type IconName = React.ComponentProps<typeof Ionicons>['name'];



export interface QuickLinkItem {

  title: string;

  href: string;

  icon: IconName;

}



export function QuickLinksList({ items }: { items: QuickLinkItem[] }) {

  const { palette } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);



  return (

    <View style={styles.card}>

      {items.map((item, index) => (

        <View key={item.href}>

          <Link href={item.href as never} asChild>

            <Pressable

              style={({ pressed }) => [styles.row, pressed && styles.pressed]}

              accessibilityRole="button"

            >

              <Ionicons name={item.icon} size={20} color={palette.textSecondary} />

              <Text style={styles.title}>{item.title}</Text>

              <Ionicons name="chevron-forward" size={16} color={palette.textLight} />

            </Pressable>

          </Link>

          {index < items.length - 1 ? <View style={styles.divider} /> : null}

        </View>

      ))}

    </View>

  );

}



function createStyles(p: AppPalette) {

  return StyleSheet.create({

    card: {

      backgroundColor: p.surface,

      borderRadius: radius.lg,

      borderWidth: 1,

      borderColor: p.borderLight,

      overflow: 'hidden',

    },

    row: {

      flexDirection: 'row',

      alignItems: 'center',

      gap: spacing.md,

      paddingVertical: spacing.lg,

      paddingHorizontal: spacing.lg,

      minHeight: 52,

    },

    pressed: { backgroundColor: p.surfaceMuted },

    title: {

      ...typography.body,

      color: p.text,

      flex: 1,

      fontWeight: '500',

    },

    divider: {

      height: StyleSheet.hairlineWidth,

      backgroundColor: p.borderLight,

      marginLeft: spacing.lg + 20 + spacing.md,

    },

  });

}


