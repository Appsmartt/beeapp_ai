import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Star, MapPin, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react-native';
import { AI_SEARCH_RESULTS, AiSearchResult } from '../../mocks/aiSearchResults';
import VerifiedBadge from '../VerifiedBadge';

interface AiCatalogCardsProps {
  onContact?: (result: AiSearchResult) => void;
}

export default function AiCatalogCards({ onContact }: AiCatalogCardsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatPrice = (value: number) => {
    return `$ ${value.toLocaleString('es-CO')}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {AI_SEARCH_RESULTS.map((item) => {
          const isExpanded = expandedId === item.id;
          const isProduct = item.price !== null;
          const priceLabel = isProduct && item.price !== null ? formatPrice(item.price) : 'Precio por acordar';

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.sellerRow}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{item.sellerName.charAt(0)}</Text>
                </View>
                <View style={styles.sellerMeta}>
                  <View style={styles.nameVerifiedRow}>
                    <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
                    {item.sellerVerified && <VerifiedBadge size={12} />}
                  </View>
                  <Text style={styles.cityText}>{item.city}</Text>
                </View>
              </View>

              <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>

              <View style={styles.priceRatingRow}>
                <Text style={styles.priceText}>{priceLabel}</Text>
                <View style={styles.ratingBox}>
                  <Star size={12} color="#D97706" fill="#D97706" style={{ marginRight: 2 }} />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={styles.expandedBox}>
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>
              )}

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailBtnText}>{isExpanded ? 'Ocultar' : 'Ver detalle'}</Text>
                  {isExpanded ? (
                    <ChevronUp size={13} color={colors.neutral.gray600} />
                  ) : (
                    <ChevronDown size={13} color={colors.neutral.gray600} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() => onContact?.(item)}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={12} color={colors.neutral.white} style={{ marginRight: 4 }} />
                  <Text style={styles.contactBtnText}>Solicitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    width: '100%',
  },
  scrollContent: {
    paddingLeft: 4,
    paddingRight: 16,
    gap: 12,
  },
  card: {
    width: 260,
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  sellerMeta: {
    flex: 1,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sellerName: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    maxWidth: 160,
  },
  cityText: {
    fontSize: 10,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    lineHeight: 17,
    marginBottom: 6,
  },
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  expandedBox: {
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    lineHeight: 16,
    fontWeight: '400',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailBtnText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  contactBtnText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '600',
  },
});
