import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import MockPhoto from './MockPhoto';

interface DetailGalleryProps {
  tones: string[];
  categoryId: string;
}

/** Swipeable gallery of the listing photos (mock tiles) with page dots. */
export default function DetailGallery({ tones, categoryId }: DetailGalleryProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
        >
          {tones.map((tone, i) => (
            <MockPhoto
              key={`${tone}-${i}`}
              tone={tone}
              categoryId={categoryId}
              iconSize={54}
              style={{ width, height: 210 }}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.dots}>
        {tones.map((tone, i) => (
          <View key={`dot-${tone}-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.gray300,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
    width: 16,
  },
});
