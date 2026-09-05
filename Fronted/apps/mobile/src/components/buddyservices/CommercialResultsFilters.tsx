import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';

import type {
  CommercialModality,
  CommercialOfferType,
} from '@beeapp/shared-types';

import {
  COMMERCIAL_MODALITY_OPTIONS,
  COMMERCIAL_OFFER_TYPE_OPTIONS,
  COMMERCIAL_ORDERING_OPTIONS,
} from '../../features/buddyservices/commercialLabels';

export interface CommercialResultsFilterValue {
  offerType: CommercialOfferType | null;
  modality: CommercialModality | null;
  verifiedOnly: boolean;
  deliveryOnly: boolean;
  ordering: 'recent' | 'name';
}

interface CommercialResultsFiltersProps {
  value: CommercialResultsFilterValue;
  disabled?: boolean;
  onChange: (
    nextValue: CommercialResultsFilterValue,
  ) => void;
  onClear: () => void;
}

type FilterModalMode =
  | 'offerType'
  | 'modality'
  | 'ordering'
  | null;

function activeFilterCount(
  value: CommercialResultsFilterValue,
): number {
  return [
    value.offerType,
    value.modality,
    value.verifiedOnly,
    value.deliveryOnly,
    value.ordering !== 'recent',
  ].filter(Boolean).length;
}

function filterLabel(
  value: CommercialResultsFilterValue,
): string {
  const count = activeFilterCount(value);

  return count > 0
    ? `Filtros (${count})`
    : 'Filtros';
}

export default function CommercialResultsFilters({
  value,
  disabled = false,
  onChange,
  onClear,
}: CommercialResultsFiltersProps) {
  const [modalMode, setModalMode] =
    useState<FilterModalMode>(null);

  const closeModal = () => {
    setModalMode(null);
  };

  const selectOfferType = (
    offerType: CommercialOfferType | null,
  ) => {
    onChange({
      ...value,
      offerType,
    });
    closeModal();
  };

  const selectModality = (
    modality: CommercialModality | null,
  ) => {
    onChange({
      ...value,
      modality,
    });
    closeModal();
  };

  const selectOrdering = (
    ordering: 'recent' | 'name',
  ) => {
    onChange({
      ...value,
      ordering,
    });
    closeModal();
  };

  const count = activeFilterCount(value);

  return (
    <>
      <View style={styles.toolbar}>
        <TouchableOpacity
          accessibilityLabel={filterLabel(value)}
          accessibilityRole="button"
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => setModalMode('offerType')}
          style={[
            styles.filterButton,
            count > 0 && styles.filterButtonActive,
            disabled && styles.disabled,
          ]}
        >
          <Filter
            color={count > 0 ? '#FFFFFF' : '#7427D5'}
            size={17}
          />

          <Text
            style={[
              styles.filterButtonText,
              count > 0 && styles.filterButtonTextActive,
            ]}
          >
            {filterLabel(value)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Filtrar por modalidad"
          accessibilityRole="button"
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => setModalMode('modality')}
          style={[
            styles.roundButton,
            value.modality && styles.roundButtonActive,
            disabled && styles.disabled,
          ]}
        >
          <SlidersHorizontal
            color={
              value.modality
                ? '#FFFFFF'
                : '#7427D5'
            }
            size={18}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Cambiar orden de resultados"
          accessibilityRole="button"
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => setModalMode('ordering')}
          style={[
            styles.sortButton,
            value.ordering !== 'recent'
              && styles.sortButtonActive,
            disabled && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.sortButtonText,
              value.ordering !== 'recent'
                && styles.sortButtonTextActive,
            ]}
          >
            {value.ordering === 'name'
              ? 'Nombre'
              : 'Recientes'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          accessibilityLabel="Alternar solo negocios verificados"
          accessibilityRole="switch"
          accessibilityState={{
            checked: value.verifiedOnly,
            disabled,
          }}
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => onChange({
            ...value,
            verifiedOnly: !value.verifiedOnly,
          })}
          style={styles.switchRow}
        >
          <Text style={styles.switchLabel}>
            Solo verificados
          </Text>

          <Switch
            onValueChange={(verifiedOnly) => onChange({
              ...value,
              verifiedOnly,
            })}
            thumbColor="#FFFFFF"
            trackColor={{
              false: '#D7C8E3',
              true: '#7427D5',
            }}
            value={value.verifiedOnly}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Alternar solo negocios con domicilio"
          accessibilityRole="switch"
          accessibilityState={{
            checked: value.deliveryOnly,
            disabled,
          }}
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => onChange({
            ...value,
            deliveryOnly: !value.deliveryOnly,
          })}
          style={styles.switchRow}
        >
          <Text style={styles.switchLabel}>
            Con domicilio
          </Text>

          <Switch
            onValueChange={(deliveryOnly) => onChange({
              ...value,
              deliveryOnly,
            })}
            thumbColor="#FFFFFF"
            trackColor={{
              false: '#D7C8E3',
              true: '#7427D5',
            }}
            value={value.deliveryOnly}
          />
        </TouchableOpacity>
      </View>

      {count > 0 ? (
        <View style={styles.clearRow}>
          <TouchableOpacity
            accessibilityLabel="Limpiar filtros"
            accessibilityRole="button"
            activeOpacity={0.75}
            disabled={disabled}
            onPress={onClear}
            style={styles.clearButton}
          >
            <X
              color="#7427D5"
              size={16}
            />

            <Text style={styles.clearText}>
              Limpiar filtros
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={closeModal}
        transparent
        visible={modalMode !== null}
      >
        <Pressable
          onPress={closeModal}
          style={styles.backdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.sheet}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {modalMode === 'offerType'
                  ? 'Tipo de oferta'
                  : modalMode === 'modality'
                  ? 'Modalidad'
                  : 'Ordenar resultados'}
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar filtros"
                accessibilityRole="button"
                hitSlop={10}
                onPress={closeModal}
                style={styles.closeButton}
              >
                <X
                  color="#523C70"
                  size={21}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            >
              {modalMode === 'offerType' ? (
                <>
                  <FilterOption
                    label="Todos los tipos"
                    selected={value.offerType === null}
                    onPress={() => selectOfferType(null)}
                  />

                  {COMMERCIAL_OFFER_TYPE_OPTIONS.map((item) => (
                    <FilterOption
                      key={item.value}
                      label={item.label}
                      selected={value.offerType === item.value}
                      onPress={() => selectOfferType(item.value)}
                    />
                  ))}
                </>
              ) : null}

              {modalMode === 'modality' ? (
                <>
                  <FilterOption
                    label="Todas las modalidades"
                    selected={value.modality === null}
                    onPress={() => selectModality(null)}
                  />

                  {COMMERCIAL_MODALITY_OPTIONS.map((item) => (
                    <FilterOption
                      key={item.value}
                      label={item.label}
                      selected={value.modality === item.value}
                      onPress={() => selectModality(item.value)}
                    />
                  ))}
                </>
              ) : null}

              {modalMode === 'ordering'
                ? COMMERCIAL_ORDERING_OPTIONS.map((item) => (
                  <FilterOption
                    key={item.value}
                    label={item.label}
                    selected={value.ordering === item.value}
                    onPress={() => selectOrdering(item.value)}
                  />
                ))
                : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function FilterOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
      }}
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.option}
    >
      <Text style={styles.optionText}>
        {label}
      </Text>

      {selected ? (
        <View style={styles.check}>
          <Check
            color="#FFFFFF"
            size={14}
          />
        </View>
      ) : (
        <View style={styles.emptyCheck} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5D7EE',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: '#7427D5',
    borderColor: '#7427D5',
  },
  filterButtonText: {
    color: '#6428A6',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 7,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  roundButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5D7EE',
    borderRadius: 13,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  roundButtonActive: {
    backgroundColor: '#7427D5',
    borderColor: '#7427D5',
  },
  sortButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5D7EE',
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  sortButtonActive: {
    backgroundColor: '#7427D5',
    borderColor: '#7427D5',
  },
  sortButtonText: {
    color: '#6428A6',
    fontSize: 12,
    fontWeight: '700',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },
  switchRow: {
    alignItems: 'center',
    backgroundColor: '#FCFAFD',
    borderColor: '#EEE7F2',
    borderRadius: 13,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 10,
  },
  switchLabel: {
    color: '#49385B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  clearRow: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  clearButton: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  clearText: {
    color: '#7427D5',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.55,
  },
  backdrop: {
    backgroundColor: 'rgba(24, 11, 49, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '70%',
    minHeight: 240,
    paddingBottom: 28,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomColor: '#F0EAF3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sheetTitle: {
    color: '#261743',
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  option: {
    alignItems: 'center',
    borderBottomColor: '#F3EEF6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingVertical: 10,
  },
  optionText: {
    color: '#38294E',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  check: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  emptyCheck: {
    borderColor: '#CDBBDB',
    borderRadius: 10,
    borderWidth: 1,
    height: 20,
    width: 20,
  },
});
