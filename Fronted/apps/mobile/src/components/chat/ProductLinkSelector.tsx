import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Package, Wrench, Check } from 'lucide-react-native';
import { getMyItems, formatPrice } from '../../mocks/myServices';
import { StatusProductLink } from '../../mocks/statuses';

interface ProductLinkSelectorProps {
  visible: boolean;
  selectedId?: string;
  onLink: (product: StatusProductLink) => void;
  onClose: () => void;
}

/** Picks one product or service of BeeServices to attach to a status */
export default function ProductLinkSelector({ visible, selectedId, onLink, onClose }: ProductLinkSelectorProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedId);
  const items = getMyItems();

  // Reopening starts from the product already linked, if any
  useEffect(() => {
    if (visible) setSelected(selectedId);
  }, [visible]);

  const handleLink = () => {
    const item = items.find((i) => i.id === selected);
    if (item) onLink({ id: item.id, name: item.name, price: item.price });
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Vincular producto</Text>
          <Text style={styles.subtitle}>Elige qué publicaste en BeeServices para mostrarlo en tu estado.</Text>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no tienes productos ni servicios publicados.</Text>
            ) : (
              items.map((item) => {
                const isProduct = item.type === 'product';
                const Icon = isProduct ? Package : Wrench;
                const isSelected = selected === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.row}
                    onPress={() => setSelected(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Icon size={17} color={colors.brand.primary} />
                    </View>

                    <View style={styles.rowTexts}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.rowPrice}>
                        {item.price !== null ? formatPrice(item.price) : 'Cotización'}
                      </Text>
                    </View>

                    {isSelected && <Check size={18} color={colors.brand.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.linkBtn, !selected && styles.linkBtnDisabled]}
            disabled={!selected}
            onPress={handleLink}
            activeOpacity={0.8}
          >
            <Text style={styles.linkBtnText}>Vincular</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 4,
    lineHeight: 17,
  },
  list: { marginTop: spacing.sm },
  emptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.brand.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTexts: { flex: 1, paddingRight: spacing.sm },
  rowName: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  rowPrice: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  linkBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
