import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
} from 'react-native';

const markSource = require('../assets/logo.png') as ImageSourcePropType;
const wordmarkSource = require('../assets/logoletras.png') as ImageSourcePropType;

type BuddyLogoProps = {
  size?: number;
  showText?: boolean;
  autoStopAfter?: number;
};

export default function BuddyLogo({
  size = 100,
  showText = true,
}: BuddyLogoProps) {
  if (!showText) {
    return (
      <View style={[styles.markContainer, { width: size, height: size }]}>
        <Image
          source={markSource}
          resizeMode="contain"
          style={styles.mark}
          accessibilityLabel="Buddy AI"
        />
      </View>
    );
  }

  const wordmarkWidth = Math.min(Math.round(size * 2.15), 260);
  const wordmarkHeight = Math.round(wordmarkWidth * (600 / 1600));

  return (
    <View
      style={[
        styles.wordmarkContainer,
        {
          width: wordmarkWidth,
          height: wordmarkHeight,
        },
      ]}
    >
      <Image
        source={wordmarkSource}
        resizeMode="contain"
        style={styles.wordmark}
        accessibilityLabel="Buddy AI"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  markContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: '100%',
    height: '100%',
  },
  wordmarkContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  wordmark: {
    width: '100%',
    height: '100%',
  },
});
