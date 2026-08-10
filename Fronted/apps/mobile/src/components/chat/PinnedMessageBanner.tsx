import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pin, X } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

interface PinnedMessageBannerProps {
  text: string;
  onUnpin: () => void;
}

export default function PinnedMessageBanner({ text, onUnpin }: PinnedMessageBannerProps) {
  return (
    <View style={styles.container}>
      <Pin size={14} color={colors.brand.primary} style={styles.icon} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Mensaje fijado</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {text}
        </Text>
      </View>
      <TouchableOpacity onPress={onUnpin} style={styles.closeBtn} activeOpacity={0.7}>
        <X size={16} color={colors.neutral.gray500} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    zIndex: 5,
  },
  icon: {
    marginRight: 8,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preview: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
