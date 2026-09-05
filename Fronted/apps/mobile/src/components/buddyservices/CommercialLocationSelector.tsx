import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronDown,
  MapPin,
  X,
} from 'lucide-react-native';

import type {
  CommercialCity,
  CommercialCountry,
} from '@beeapp/shared-types';

type PickerMode = 'country' | 'city' | null;

interface CommercialLocationSelectorProps {
  countries: CommercialCountry[];
  cities: CommercialCity[];
  countryCode: string;
  city: string | null;
  loadingCountries?: boolean;
  loadingCities?: boolean;
  disabled?: boolean;
  onSelectCountry: (countryCode: string) => void;
  onSelectCity: (city: string) => void;
}

function countryLabel(countryCode: string): string {
  if (countryCode === 'CO') {
    return 'Colombia';
  }

  return countryCode;
}

export default function CommercialLocationSelector({
  countries,
  cities,
  countryCode,
  city,
  loadingCountries = false,
  loadingCities = false,
  disabled = false,
  onSelectCountry,
  onSelectCity,
}: CommercialLocationSelectorProps) {
  const [pickerMode, setPickerMode] = useState<PickerMode>(
    null,
  );

  const isCountryPicker = pickerMode === 'country';
  const isCityPicker = pickerMode === 'city';

  const closePicker = () => {
    setPickerMode(null);
  };

  const selectCountry = (value: string) => {
    closePicker();
    onSelectCountry(value);
  };

  const selectCity = (value: string) => {
    closePicker();
    onSelectCity(value);
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.label}>Explora en</Text>

        <View style={styles.row}>
          <TouchableOpacity
            accessibilityLabel="Seleccionar país"
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={disabled || loadingCountries}
            onPress={() => setPickerMode('country')}
            style={[
              styles.selector,
              styles.countrySelector,
              (disabled || loadingCountries)
                && styles.selectorDisabled,
            ]}
          >
            <MapPin
              color="#7427D5"
              size={18}
            />

            <Text
              numberOfLines={1}
              style={styles.selectorText}
            >
              {loadingCountries
                ? 'Cargando país…'
                : countryLabel(countryCode)}
            </Text>

            {loadingCountries ? (
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />
            ) : (
              <ChevronDown
                color="#7A6696"
                size={18}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Seleccionar ciudad"
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={
              disabled
              || loadingCities
              || !countryCode
            }
            onPress={() => setPickerMode('city')}
            style={[
              styles.selector,
              styles.citySelector,
              (!city && !loadingCities)
                && styles.selectorPending,
              (
                disabled
                || loadingCities
                || !countryCode
              ) && styles.selectorDisabled,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.selectorText,
                !city && styles.placeholderText,
              ]}
            >
              {loadingCities
                ? 'Cargando ciudades…'
                : city || 'Selecciona ciudad'}
            </Text>

            {loadingCities ? (
              <ActivityIndicator
                color="#7427D5"
                size="small"
              />
            ) : (
              <ChevronDown
                color="#7A6696"
                size={18}
              />
            )}
          </TouchableOpacity>
        </View>

        {!city ? (
          <Text style={styles.helper}>
            Selecciona una ciudad para ver negocios y categorías.
          </Text>
        ) : null}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closePicker}
        transparent
        visible={pickerMode !== null}
      >
        <Pressable
          onPress={closePicker}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalSheet}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isCountryPicker
                  ? 'Selecciona un país'
                  : 'Selecciona una ciudad'}
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar selector"
                accessibilityRole="button"
                hitSlop={10}
                onPress={closePicker}
                style={styles.closeButton}
              >
                <X
                  color="#523C70"
                  size={21}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {isCountryPicker
                ? countries.map((item) => (
                  <TouchableOpacity
                    key={item.country_code}
                    activeOpacity={0.75}
                    onPress={() => selectCountry(
                      item.country_code,
                    )}
                    style={styles.modalItem}
                  >
                    <Text style={styles.modalItemText}>
                      {countryLabel(item.country_code)}
                    </Text>

                    <Text style={styles.modalItemCode}>
                      {item.country_code}
                    </Text>
                  </TouchableOpacity>
                ))
                : cities.map((item) => (
                  <TouchableOpacity
                    key={item.city}
                    activeOpacity={0.75}
                    onPress={() => selectCity(item.city)}
                    style={styles.modalItem}
                  >
                    <Text style={styles.modalItemText}>
                      {item.city}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {(
              isCountryPicker
              && !loadingCountries
              && countries.length === 0
            ) || (
              isCityPicker
              && !loadingCities
              && cities.length === 0
            ) ? (
              <Text style={styles.emptyText}>
                No hay opciones disponibles por ahora.
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 22,
  },
  label: {
    color: '#261743',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  selector: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE1F1',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  countrySelector: {
    flex: 1,
  },
  citySelector: {
    flex: 1.25,
  },
  selectorPending: {
    borderColor: '#D8B6F0',
  },
  selectorDisabled: {
    opacity: 0.62,
  },
  selectorText: {
    color: '#38294E',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  placeholderText: {
    color: '#957DAE',
    fontWeight: '400',
  },
  helper: {
    color: '#8A72B2',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(24, 11, 49, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '70%',
    minHeight: 220,
    paddingBottom: 28,
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: '#F0EAF3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalTitle: {
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
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalItem: {
    alignItems: 'center',
    borderBottomColor: '#F3EEF6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingVertical: 10,
  },
  modalItemText: {
    color: '#38294E',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  modalItemCode: {
    color: '#8A72B2',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 12,
  },
  emptyText: {
    color: '#7A6696',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    textAlign: 'center',
  },
});
