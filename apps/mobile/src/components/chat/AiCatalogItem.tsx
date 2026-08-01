import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Star, MapPin, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react-native';
import { AiSearchResult } from '../../mocks/aiSearchResults';
import VerifiedBadge from '../VerifiedBadge';

interface AiCatalogItemProps {
  item: AiSearchResult;
  onContact: () => void;
}

export default function AiCatalogItem({ item, onContact }: AiCatalogItemProps) {
  const [expanded, setExpanded] = useState(false);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isProduct = item.price !== null;
  const priceLabel = isProduct && item.price !== null ? formatPrice(item.price) : 'Precio por acordar';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Mock Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>
            {item.productName.charAt(0)}
          </Text>
        </View>

        {/* Content column */}
        <View style={styles.contentCol}>
          <View style={styles.sellerRow}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.sellerName}
            </Text>
            {item.sellerVerified && <VerifiedBadge size={13} style={styles.verified} />}
          </View>

          <Text style={styles.productName} numberOfLines={2}>
            {item.productName}
          </Text>

          <Text style={styles.price}>{priceLabel}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBox}>
              <Star size={12} color="#D97706" fill="#D97706" style={{ marginRight: 2 }} />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
            
            <View style={styles.cityBox}>
              <MapPin size={12} color={colors.neutral.gray500} style={{ marginRight: 2 }} />
              <Text style={styles.cityText}>{item.city}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Expanded description block */}
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.expandedTitle}>Detalles del servicio:</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      )}

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailBtnText}>
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          </Text>
          {expanded ? (
            <ChevronUp size={14} color={colors.neutral.gray600} />
          ) : (
            <ChevronDown size={14} color={colors.neutral.gray600} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactBtn} onPress={onContact} activeOpacity={0.8}>
          <MessageSquare size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
          <Text style={styles.contactBtnText}>Solicitar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imagePlaceholderText: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  contentCol: {
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sellerName: {
    fontSize: 11,
    color: colors.neutral.gray500,
    fontWeight: '400',
    maxWidth: '85%',
  },
  verified: {
    marginLeft: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  ratingText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  cityBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: colors.neutral.gray700,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailBtnText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '400',
    marginRight: 4,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  contactBtnText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
