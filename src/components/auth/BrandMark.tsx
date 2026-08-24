import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { initifyLogo } from './brand-assets';

interface BrandMarkProps {
  /** Logo height — width scales to keep aspect ratio */
  size?: number;
  /** @deprecated Logo is a single asset; kept for call-site compatibility */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function BrandMark({ size = 96, style }: BrandMarkProps) {
  const width = size * 0.92;

  return (
    <View
      style={[styles.wrap, { width, height: size }, style]}
      accessibilityRole="image"
    >
      <Image
        source={initifyLogo}
        style={[styles.image, { width, height: size }]}
        resizeMode="contain"
        accessibilityLabel="IniTify logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
