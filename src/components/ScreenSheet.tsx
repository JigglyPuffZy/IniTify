import { useMemo } from 'react';

import {

  ScrollView,

  StyleSheet,

  View,

  type ViewStyle,

  type RefreshControlProps,

} from 'react-native';

import { radius, spacing } from '@/src/theme';

import { useAppTheme } from '@/src/theme/useAppTheme';

import type { AppPalette } from '@/src/theme/palettes';



interface ScreenSheetProps {

  hero: React.ReactNode;

  children: React.ReactNode;

  horizontalPadding?: number;

  contentStyle?: ViewStyle;

  scroll?: boolean;

  refreshControl?: React.ReactElement<RefreshControlProps>;

}



export function ScreenSheet({

  hero,

  children,

  horizontalPadding = spacing.xl,

  contentStyle,

  scroll = true,

  refreshControl,

}: ScreenSheetProps) {

  const { palette } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);



  const body = (

    <View style={[styles.content, { paddingHorizontal: horizontalPadding }, contentStyle]}>

      {children}

    </View>

  );



  return (

    <View style={styles.root}>

      {hero}

      <View style={styles.sheet}>

        {scroll ? (

          <ScrollView

            showsVerticalScrollIndicator={false}

            contentContainerStyle={styles.scrollContent}

            keyboardShouldPersistTaps="handled"

            refreshControl={refreshControl}

          >

            {body}

          </ScrollView>

        ) : (

          body

        )}

      </View>

    </View>

  );

}



export function FloatingCardWrap({ children }: { children: React.ReactNode }) {

  const { palette } = useAppTheme();

  const styles = useMemo(() => createStyles(palette), [palette]);

  return <View style={styles.floatWrap}>{children}</View>;

}



function createStyles(p: AppPalette) {

  return StyleSheet.create({

    root: {

      flex: 1,

      backgroundColor: p.heroGradient[0],

    },

    sheet: {

      flex: 1,

      marginTop: -20,

      backgroundColor: p.background,

      borderTopLeftRadius: radius.xxl,

      borderTopRightRadius: radius.xxl,

      overflow: 'hidden',

    },

    scrollContent: {

      paddingBottom: spacing.xxxl,

    },

    content: {

      paddingTop: spacing.lg,

      paddingBottom: spacing.xl,

    },

    floatWrap: {

      marginTop: -36,

      marginBottom: spacing.md,

    },

  });

}


