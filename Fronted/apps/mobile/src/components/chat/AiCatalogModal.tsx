import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { AI_SEARCH_RESULTS, AiSearchResult } from '../../mocks/aiSearchResults';
import AiCatalogItem from './AiCatalogItem';

interface AiCatalogModalProps {
  visible: boolean;
  onClose: () => void;
  onContact: (result: AiSearchResult) => void;
}

export default function AiCatalogModal({ visible, onClose, onContact }: AiCatalogModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.sheet}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Resultados encontrados</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <X size={20} color={colors.neutral.text} />
                </TouchableOpacity>
              </View>

              {/* Scrollable list */}
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {AI_SEARCH_RESULTS.map((res) => (
                  <AiCatalogItem
                    key={res.id}
                    item={res}
                    onContact={() => onContact(res)}
                  />
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
