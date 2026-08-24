import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState } from '@/src/components/ScreenContainer';
import { useAuth } from '@/src/context/AuthContext';
import { useIniTify } from '@/src/context/IniTifyContext';
import { useResponsiveTabBar } from '@/src/utils/responsive';
import { radius, fonts, tabBarShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  color,
  size,
  focused,
  accent,
  activePillBg,
  wrapWidth,
  wrapHeight,
}: {
  name: IconName;
  color: string;
  size: number;
  focused?: boolean;
  accent?: string;
  activePillBg: string;
  wrapWidth: number;
  wrapHeight: number;
}) {
  const activeColor = accent && focused ? accent : color;

  return (
    <View style={[styles.iconWrap, { width: wrapWidth, height: wrapHeight }]}>
      {focused ? (
        <View
          style={[
            styles.activePill,
            {
              width: wrapWidth,
              height: wrapHeight,
              backgroundColor: accent && focused ? `${accent}18` : activePillBg,
            },
          ]}
        />
      ) : null}
      <Ionicons name={name} size={size} color={activeColor} />
    </View>
  );
}

export default function TabLayout() {
  const tab = useResponsiveTabBar();
  const { palette, isDark } = useAppTheme();
  const { user, isLoading: authLoading } = useAuth();
  const { unreadNotificationCount } = useIniTify();

  if (authLoading) {
    return <LoadingState message="Loading IniTify…" />;
  }
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const iconProps = {
    wrapWidth: tab.iconWrapWidth,
    wrapHeight: tab.iconWrapHeight,
    activePillBg: palette.primarySoft,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.border,
          height: tab.totalHeight,
          paddingBottom: tab.safeBottom,
          paddingTop: tab.paddingTop,
          paddingHorizontal: 4,
          ...tabBarShadow(isDark),
        },
        tabBarItemStyle: {
          minWidth: tab.itemMinWidth,
          paddingVertical: 0,
          justifyContent: 'flex-start',
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemiBold,
          fontSize: tab.labelSize,
          lineHeight: tab.labelLineHeight,
          marginTop: tab.labelMarginTop,
          marginBottom: 0,
          ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
        },
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="home"
        options={{
          title: tab.labels.home,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={tab.iconSize}
              focused={focused}
              {...iconProps}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: tab.labels.checkIn,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'pulse' : 'pulse-outline'}
              color={color}
              size={tab.iconSize}
              focused={focused}
              {...iconProps}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: tab.labels.notifications,
          tabBarBadge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'notifications' : 'notifications-outline'}
              color={color}
              size={tab.iconSize}
              focused={focused}
              {...iconProps}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: tab.labels.emergency,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'call' : 'call-outline'}
              color={color}
              size={tab.iconSize}
              focused={focused}
              {...iconProps}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tab.labels.profile,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={tab.iconSize}
              focused={focused}
              {...iconProps}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
});
