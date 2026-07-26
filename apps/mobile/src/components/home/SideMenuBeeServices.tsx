import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Store, ChevronRight } from 'lucide-react-native';
import AssistantGlow from '../assistant/AssistantGlow';

interface SideMenuBeeServicesProps {
  onPress: () => void;
}

/**
 * Highlighted marketplace entry of the side menu: purple accent, the same
 * pulsing halo used by the assistant and a slow shine sweeping the card.
 */
export default function SideMenuBeeServices({ onPress }: SideMenuBeeServicesProps) {
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shine.interpolate({ inputRange: [0, 1], outputRange: [-140, 340] });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Shine sweep */}
      <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX }, { rotate: '18deg' }] }]} />

      <View style={styles.iconWrap}>
        <AssistantGlow size={38} color="#A855F7" />
        <View style={styles.iconCircle}>
          <Store size={18} color={colors.neutral.white} />
        </View>
      </View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>BeeServices</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Nuevo</Text>
          </View>
        </View>
        <Text style={styles.desc}>Marketplace: compra y vende productos y servicios</Text>
      </View>

      <ChevronRight size={18} color={colors.brand.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  shine: {
    position: 'absolute',
    top: -30,
    width: 46,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  pill: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.neutral.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  desc: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 3,
    lineHeight: 14,
  },
});
