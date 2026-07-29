import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { X, ImagePlus, Plus, Trash2, Tag, FileText, DollarSign, Truck } from 'lucide-react-native';
import { BusinessProduct, DeliveryMethod, ProductCharacteristic } from '../../mocks/myServices';

interface CreateProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
  allowedDeliveryMethods: DeliveryMethod[];
  initialData?: BusinessProduct;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  images: string[];
  characteristics: ProductCharacteristic[];
  deliveryMethod: DeliveryMethod;
}

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  domicilio: 'Domicilio',
  recoger: 'Recoger',
  consumir: 'Consumir',
};

export default function CreateProductModal({
  visible,
  onClose,
  onSave,
  allowedDeliveryMethods,
  initialData,
}: CreateProductModalProps) {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [characteristics, setCharacteristics] = useState<ProductCharacteristic[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    allowedDeliveryMethods[0] || 'domicilio',
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setDescription(initialData?.description ?? '');
      setPriceStr(initialData?.price !== undefined ? String(initialData.price) : '');
      setImages(initialData?.images ?? []);
      setCharacteristics(initialData?.characteristics ?? []);
      setDeliveryMethod(
        initialData?.deliveryMethod ?? allowedDeliveryMethods[0] ?? 'domicilio',
      );
      setSubmitted(false);
    }
  }, [visible, initialData, allowedDeliveryMethods]);

  const handleAddImage = () => {
    if (images.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes agregar hasta 5 imágenes.');
      return;
    }
    const newImg = `mock_image_${images.length + 1}`;
    setImages([...images, newImg]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const handleAddChar = () => {
    if (characteristics.length >= 10) {
      Alert.alert('Límite alcanzado', 'Puedes agregar hasta 10 características.');
      return;
    }
    setCharacteristics([...characteristics, { name: '', value: '' }]);
  };

  const handleUpdateChar = (index: number, field: 'name' | 'value', text: string) => {
    const updated = [...characteristics];
    updated[index] = { ...updated[index], [field]: text };
    setCharacteristics(updated);
  };

  const handleRemoveChar = (index: number) => {
    setCharacteristics(characteristics.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    setSubmitted(true);
    const parsedPrice = parseFloat(priceStr);
    if (!name.trim() || isNaN(parsedPrice) || parsedPrice <= 0) return;

    // Filter out incomplete characteristics
    const validChars = characteristics.filter(
      (c) => c.name.trim() !== '' && c.value.trim() !== '',
    );

    onSave({
      name: name.trim(),
      description: description.trim(),
      price: parsedPrice,
      images,
      characteristics: validChars,
      deliveryMethod,
    });
  };

  const nameError = submitted && !name.trim();
  const priceError = submitted && (priceStr.trim() === '' || isNaN(parseFloat(priceStr)));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={22} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </Text>
          <View style={styles.closePlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Name */}
          <View style={styles.labelRow}>
            <Tag size={15} color={colors.neutral.gray500} />
            <Text style={styles.label}>Nombre del producto *</Text>
          </View>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            placeholder="Ej. Laptop HP"
            placeholderTextColor={colors.neutral.gray400}
            value={name}
            onChangeText={setName}
          />
          {nameError && <Text style={styles.errorText}>El nombre es requerido.</Text>}

          {/* Description */}
          <View style={styles.labelRow}>
            <FileText size={15} color={colors.neutral.gray500} />
            <Text style={styles.label}>Descripción</Text>
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Especificaciones o descripción del producto..."
            placeholderTextColor={colors.neutral.gray400}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Price */}
          <View style={styles.labelRow}>
            <DollarSign size={15} color={colors.neutral.gray500} />
            <Text style={styles.label}>Precio *</Text>
          </View>
          <TextInput
            style={[styles.input, priceError && styles.inputError]}
            placeholder="Ej. 1200000"
            placeholderTextColor={colors.neutral.gray400}
            keyboardType="numeric"
            value={priceStr}
            onChangeText={setPriceStr}
          />
          {priceError && <Text style={styles.errorText}>Ingresa un precio válido.</Text>}

          {/* Images */}
          <Text style={styles.sectionTitle}>Imágenes del producto ({images.length}/5)</Text>
          <View style={styles.imageRow}>
            <TouchableOpacity style={styles.addImageBox} onPress={handleAddImage} activeOpacity={0.7}>
              <ImagePlus size={22} color={colors.neutral.gray500} />
              <Text style={styles.addImageText}>Agregar</Text>
            </TouchableOpacity>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imageThumb}>
                <Text style={styles.imageThumbText}>Img {idx + 1}</Text>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => handleRemoveImage(idx)}
                >
                  <X size={10} color={colors.neutral.white} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Delivery Method */}
          <View style={[styles.labelRow, { marginTop: 14 }]}>
            <Truck size={15} color={colors.neutral.gray500} />
            <Text style={styles.label}>Método de entrega *</Text>
          </View>
          <View style={styles.chipsWrap}>
            {allowedDeliveryMethods.map((m) => {
              const isActive = deliveryMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setDeliveryMethod(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {DELIVERY_METHOD_LABELS[m] ?? m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Characteristics */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Características ({characteristics.length}/10)</Text>
            <TouchableOpacity style={styles.addCharBtn} onPress={handleAddChar} activeOpacity={0.7}>
              <Plus size={16} color={colors.brand.primary} />
              <Text style={styles.addCharText}>Agregar</Text>
            </TouchableOpacity>
          </View>
          {characteristics.map((char, index) => (
            <View key={index} style={styles.charRow}>
              <TextInput
                style={[styles.input, styles.charInput, { marginRight: 8 }]}
                placeholder="Propiedad (ej. Color)"
                placeholderTextColor={colors.neutral.gray400}
                value={char.name}
                onChangeText={(txt) => handleUpdateChar(index, 'name', txt)}
              />
              <TextInput
                style={[styles.input, styles.charInput]}
                placeholder="Valor (ej. Negro)"
                placeholderTextColor={colors.neutral.gray400}
                value={char.value}
                onChangeText={(txt) => handleUpdateChar(index, 'value', txt)}
              />
              <TouchableOpacity
                onPress={() => handleRemoveChar(index)}
                style={styles.deleteCharBtn}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closePlaceholder: { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.neutral.text },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: FONT.body,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 14,
    backgroundColor: colors.neutral.white,
  },
  inputError: { borderColor: colors.semantic.error },
  errorText: { fontSize: 11, fontWeight: '400', color: colors.semantic.error, marginTop: -10, marginBottom: 12 },
  multiline: { height: 80, textAlignVertical: 'top', paddingTop: 10 },

  // Images
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral.text, marginBottom: 10 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  addImageBox: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: { fontSize: 10, color: colors.neutral.gray500, marginTop: 2 },
  imageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.brand.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.brand.primary + '30',
  },
  imageThumbText: { fontSize: 11, color: colors.brand.primary, fontWeight: '600' },
  removeImageBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: colors.neutral.white,
  },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '10' },
  chipText: { fontSize: FONT.caption, fontWeight: '400', color: colors.neutral.gray600 },
  chipTextActive: { color: colors.brand.primary, fontWeight: '600' },

  // Characteristics
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  addCharBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addCharText: { fontSize: 13, fontWeight: '400', color: colors.brand.primary },
  charRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  charInput: { flex: 1, marginBottom: 0 },
  deleteCharBtn: { padding: 8, marginLeft: 4 },

  // Actions
  actionRow: { marginTop: 24, gap: 12 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.brand.primary },
  btnPrimaryText: { fontSize: FONT.body, fontWeight: '600', color: colors.neutral.white },
  btnCancel: { backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.neutral.gray300 },
  btnCancelText: { fontSize: FONT.body, fontWeight: '400', color: colors.neutral.gray600 },
});
