import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  PROFILE_AVATARS,
  profileAvatarImageUrl,
  type ProfileAvatarId,
} from '@/src/constants/profile-avatars';
import { fonts, radius, spacing, typography, cardShadow } from '@/src/theme';
import { useAppTheme } from '@/src/theme/useAppTheme';
import type { AppPalette } from '@/src/theme/palettes';

export function ProfileAvatarPicker({
  visible,
  name,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  name: string;
  selectedId: ProfileAvatarId;
  onSelect: (id: ProfileAvatarId) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Pick your avatar</Text>
        <Text style={styles.subtitle}>Cartoon portraits like Google Play — shown on Home & Profile</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {PROFILE_AVATARS.map((option) => {
            const selected = option.id === selectedId;
            const uri = profileAvatarImageUrl(option.id, name, 144);
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.tile,
                  selected && styles.tileSelected,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={[styles.tileRing, { backgroundColor: option.ring }]}>
                  <Image source={{ uri }} style={styles.tileImage} accessibilityIgnoresInvertColors />
                </View>
                <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>
                  {option.label}
                </Text>
                {selected ? (
                  <View style={styles.selectedMark}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.closeBtnText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function createStyles(p: AppPalette, isDark: boolean) {
  const shadow = cardShadow();

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.45)',
    },
    sheet: {
      backgroundColor: p.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      maxHeight: '82%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      ...shadow,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: p.border,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontFamily: fonts.header,
      fontSize: 22,
      color: p.text,
      letterSpacing: -0.4,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.caption,
      color: p.textMuted,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: spacing.lg,
      lineHeight: 18,
      paddingHorizontal: spacing.md,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    tile: {
      width: '30%',
      minWidth: 96,
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    tileSelected: {
      borderColor: p.primary,
      backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : p.primarySoft,
    },
    tileRing: {
      width: 72,
      height: 72,
      borderRadius: radius.pill,
      padding: 3,
      overflow: 'hidden',
    },
    tileImage: {
      width: '100%',
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: '#E2E8F0',
    },
    tileLabel: {
      ...typography.caption,
      fontFamily: fonts.bodyMedium,
      color: p.textMuted,
      textAlign: 'center',
    },
    tileLabelSelected: {
      color: p.primary,
      fontFamily: fonts.bodySemiBold,
    },
    selectedMark: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 20,
      height: 20,
      borderRadius: radius.pill,
      backgroundColor: p.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: p.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    closeBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: p.text,
    },
    pressed: { opacity: 0.88 },
  });
}
