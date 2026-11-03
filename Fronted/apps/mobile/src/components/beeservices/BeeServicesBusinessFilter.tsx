import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import type {
  CommercialModality,
  CommercialOfferType,
} from '@beeapp/shared-types';

import {
  COMMERCIAL_MODALITY_OPTIONS,
  COMMERCIAL_OFFER_TYPE_OPTIONS,
  getCommercialModalityLabel,
  getCommercialOfferTypeLabel,
} from '../../features/buddyservices/commercialLabels';

type OpenSelect = 'offerType' | 'modality' | null;

interface SelectOption<T extends string> {
  value: T | null;
  label: string;
}

interface BeeServicesBusinessFilterProps {
  offerType: CommercialOfferType | null;
  modality: CommercialModality | null;
  disabled?: boolean;
  onChangeOfferType: (
    value: CommercialOfferType | null,
  ) => void;
  onChangeModality: (
    value: CommercialModality | null,
  ) => void;
}

const OFFER_TYPE_OPTIONS: Array<
  SelectOption<CommercialOfferType>
> = [
  {
    value: null,
    label: 'Todos',
  },
  ...COMMERCIAL_OFFER_TYPE_OPTIONS,
];

const MODALITY_OPTIONS: Array<
  SelectOption<CommercialModality>
> = [
  {
    value: null,
    label: 'Todas',
  },
  ...COMMERCIAL_MODALITY_OPTIONS,
];

export default function BeeServicesBusinessFilter({
  offerType,
  modality,
  disabled = false,
  onChangeOfferType,
  onChangeModality,
}: BeeServicesBusinessFilterProps) {
  const [openSelect, setOpenSelect] =
    useState<OpenSelect>(null);

  const toggleSelect = (next: Exclude<OpenSelect, null>) => {
    setOpenSelect((current) => (
      current === next ? null : next
    ));
  };

  const offerTypeLabel = offerType
    ? getCommercialOfferTypeLabel(offerType)
    : 'Productos o servicios';
  const modalityLabel = modality
    ? getCommercialModalityLabel(modality)
    : 'Modalidad';
  const options = openSelect === 'offerType'
    ? OFFER_TYPE_OPTIONS
    : openSelect === 'modality'
      ? MODALITY_OPTIONS
      : [];
  const selectedValue = openSelect === 'offerType'
    ? offerType
    : openSelect === 'modality'
      ? modality
      : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Filtrar negocios
      </Text>

      <View style={styles.triggers}>
        <TouchableOpacity
          accessibilityLabel={`Filtrar por productos o servicios: ${offerTypeLabel}`}
          accessibilityRole="button"
          accessibilityState={{
            disabled,
            expanded: openSelect === 'offerType',
          }}
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => toggleSelect('offerType')}
          style={[
            styles.trigger,
            offerType && styles.triggerActive,
            openSelect === 'offerType' && styles.triggerOpen,
            disabled && styles.triggerDisabled,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.triggerText,
              offerType && styles.triggerTextActive,
            ]}
          >
            {offerTypeLabel}
          </Text>

          <ChevronDown
            color={offerType ? '#7427D5' : '#6C7892'}
            size={16}
            strokeWidth={2.4}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Filtrar por modalidad: ${modalityLabel}`}
          accessibilityRole="button"
          accessibilityState={{
            disabled,
            expanded: openSelect === 'modality',
          }}
          activeOpacity={0.78}
          disabled={disabled}
          onPress={() => toggleSelect('modality')}
          style={[
            styles.trigger,
            modality && styles.triggerActive,
            openSelect === 'modality' && styles.triggerOpen,
            disabled && styles.triggerDisabled,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.triggerText,
              modality && styles.triggerTextActive,
            ]}
          >
            {modalityLabel}
          </Text>

          <ChevronDown
            color={modality ? '#7427D5' : '#6C7892'}
            size={16}
            strokeWidth={2.4}
          />
        </TouchableOpacity>
      </View>

      {openSelect ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <TouchableOpacity
                key={option.label}
                accessibilityLabel={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                activeOpacity={0.75}
                onPress={() => {
                  if (openSelect === 'offerType') {
                    onChangeOfferType(
                      option.value as CommercialOfferType | null,
                    );
                  } else {
                    onChangeModality(
                      option.value as CommercialModality | null,
                    );
                  }

                  setOpenSelect(null);
                }}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>

                {selected ? (
                  <Check
                    color="#7427D5"
                    size={16}
                    strokeWidth={2.6}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
    zIndex: 2,
  },
  title: {
    color: '#303B5A',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  triggers: {
    flexDirection: 'row',
    gap: 8,
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerActive: {
    backgroundColor: '#F6F0FF',
    borderColor: '#CDB6EE',
  },
  triggerOpen: {
    borderColor: '#7427D5',
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerText: {
    color: '#6C7892',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  triggerTextActive: {
    color: '#4A2A78',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2D6F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: '#F6F0FF',
  },
  optionText: {
    color: '#303B5A',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#4A2A78',
    fontWeight: '800',
  },
});
