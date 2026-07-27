import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { MyProductService, BEE_CATEGORIES, MyVariant } from '../../mocks/myServices';

interface MyServiceFormProps {
  initialData?: MyProductService;
  onSave: (data: Omit<MyProductService, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function MyServiceForm({ initialData, onSave, onCancel }: MyServiceFormProps) {
  const [type, setType] = useState<'product' | 'service'>(initialData?.type || 'product');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || BEE_CATEGORIES[0].id);
  const [priceStr, setPriceStr] = useState(
    initialData?.price !== undefined && initialData?.price !== null ? String(initialData.price) : ''
  );
  const [variants, setVariants] = useState<MyVariant[]>(initialData?.variants || []);
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [status, setStatus] = useState<'active' | 'inactive'>(initialData?.status || 'active');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleAddVariant = () => {
    if (variants.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes agregar hasta 5 variantes.');
      return;
    }
    setVariants([...variants, { name: '', value: '' }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleUpdateVariant = (index: number, field: 'name' | 'value', text: string) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: text };
    setVariants(updated);
  };

  const handleMockImageUpload = () => {
    setImage('mock_uploaded_image_uri');
    Alert.alert('Imagen seleccionada', 'Se ha simulado la carga de la imagen correctamente.');
  };

  const handleSave = () => {
    setHasSubmitted(true);
    if (!name.trim()) {
      return;
    }

    const price = type === 'product' ? parseFloat(priceStr) || 0 : null;

    // Filter out empty variants
    const validVariants = type === 'product'
      ? variants.filter((v) => v.name.trim() !== '' && v.value.trim() !== '')
      : [];

    onSave({
      type,
      name: name.trim(),
      description: description.trim(),
      category,
      price,
      variants: validVariants,
      image,
      status,
    });
  };

  const nameError = hasSubmitted && !name.trim();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Type Selector (Chips) */}
      <Text style={styles.label}>Tipo de oferta</Text>
      <View style={styles.chipContainer}>
        <TouchableOpacity
          style={[styles.chip, type === 'product' && styles.chipActive]}
          onPress={() => setType('product')}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, type === 'product' && styles.chipTextActive]}>Producto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, type === 'service' && styles.chipActive]}
          onPress={() => setType('service')}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, type === 'service' && styles.chipTextActive]}>Servicio</Text>
        </TouchableOpacity>
      </View>

      {/* Name Input */}
      <Text style={styles.label}>Nombre completo *</Text>
      <TextInput
        style={[styles.input, nameError && styles.inputError]}
        placeholder="Ej. Soporte Ergonómico"
        placeholderTextColor={colors.neutral.gray400}
        value={name}
        onChangeText={setName}
      />
      {nameError && <Text style={styles.errorText}>El nombre es requerido.</Text>}

      {/* Description Input */}
      <Text style={styles.label}>Descripción</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Detalla las características o especificaciones..."
        placeholderTextColor={colors.neutral.gray400}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {/* Category Selector */}
      <Text style={styles.label}>Categoría</Text>
      <View style={styles.categoriesRow}>
        {BEE_CATEGORIES.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, isSelected && { borderColor: cat.color, backgroundColor: cat.bg }]}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, isSelected && { color: cat.color, fontWeight: '700' }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Price Field */}
      <Text style={styles.label}>Precio</Text>
      {type === 'product' ? (
        <TextInput
          style={styles.input}
          placeholder="Ej. 120000"
          placeholderTextColor={colors.neutral.gray400}
          keyboardType="numeric"
          value={priceStr}
          onChangeText={setPriceStr}
        />
      ) : (
        <View style={styles.servicePriceBox}>
          <Text style={styles.servicePriceText}>El precio se acuerda por chat</Text>
        </View>
      )}

      {/* Variants (Product Only) */}
      {type === 'product' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Variantes ({variants.length}/5)</Text>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddVariant} activeOpacity={0.7}>
              <Plus size={16} color={colors.brand.primary} />
              <Text style={styles.addBtnText}>Agregar</Text>
            </TouchableOpacity>
          </View>
          {variants.map((v, index) => (
            <View key={index} style={styles.variantRow}>
              <TextInput
                style={[styles.input, styles.variantInput, { marginRight: 8 }]}
                placeholder="Propiedad (ej. Talla)"
                placeholderTextColor={colors.neutral.gray400}
                value={v.name}
                onChangeText={(text) => handleUpdateVariant(index, 'name', text)}
              />
              <TextInput
                style={[styles.input, styles.variantInput]}
                placeholder="Valor (ej. M, L)"
                placeholderTextColor={colors.neutral.gray400}
                value={v.value}
                onChangeText={(text) => handleUpdateVariant(index, 'value', text)}
              />
              <TouchableOpacity
                onPress={() => handleRemoveVariant(index)}
                style={styles.deleteBtn}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={colors.semantic.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Image Upload Mock */}
      <Text style={styles.label}>Imagen del producto/servicio</Text>
      <TouchableOpacity style={styles.imageBox} onPress={handleMockImageUpload} activeOpacity={0.7}>
        <ImageIcon size={24} color={image ? colors.brand.primary : colors.neutral.gray400} />
        <Text style={[styles.imageBoxText, image ? { color: colors.brand.primary, fontWeight: '600' } : undefined]}>
          {image ? 'Cambiar Imagen (Cargada)' : 'Agregar Imagen (Simulado)'}
        </Text>
      </TouchableOpacity>

      {/* Status Switch */}
      <View style={styles.switchRow}>
        <View>
          <Text style={[styles.label, { marginBottom: 0 }]}>Estado de publicación</Text>
          <Text style={styles.switchSub}>
            {status === 'active' ? 'Visible en tu perfil' : 'Oculto provisionalmente'}
          </Text>
        </View>
        <Switch
          value={status === 'active'}
          onValueChange={(val) => setStatus(val ? 'active' : 'inactive')}
          trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary + '80' }}
          thumbColor={status === 'active' ? colors.brand.primary : colors.neutral.gray400}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.btnTextCancel}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave} activeOpacity={0.7}>
          <Text style={styles.btnTextSave}>Guardar</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.white },
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.neutral.text, marginBottom: 8 },
  chipContainer: { flexDirection: 'row', marginBottom: 16 },
  chip: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 8, alignItems: 'center', backgroundColor: colors.neutral.white, marginRight: 8 },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: '#F3E8FF' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.neutral.gray600 },
  chipTextActive: { color: colors.brand.primary, fontWeight: '700' },
  input: { height: 44, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: colors.neutral.text, marginBottom: 12, backgroundColor: colors.neutral.white },
  inputError: { borderColor: colors.semantic.error },
  errorText: { fontSize: 11, color: colors.semantic.error, marginTop: -8, marginBottom: 12 },
  multiline: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 16, marginRight: 8, marginBottom: 8, backgroundColor: colors.neutral.white },
  catChipText: { fontSize: 12, color: colors.neutral.gray600 },
  servicePriceBox: { height: 44, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#F9FAFB', marginBottom: 16 },
  servicePriceText: { fontSize: 14, color: colors.neutral.gray500, fontStyle: 'italic' },
  section: { marginBottom: 16, borderTopWidth: 1, borderTopColor: colors.neutral.gray100, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.brand.primary, marginLeft: 4 },
  variantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  variantInput: { flex: 1, marginBottom: 0 },
  deleteBtn: { padding: 8, marginLeft: 4 },
  imageBox: { height: 72, borderWidth: 1, borderColor: colors.neutral.gray200, borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  imageBoxText: { fontSize: 12, color: colors.neutral.gray500, marginTop: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.neutral.gray100, paddingTop: 16, marginBottom: 24 },
  switchSub: { fontSize: 11, color: colors.neutral.gray500, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.neutral.gray300, marginRight: 12 },
  btnSave: { backgroundColor: colors.brand.primary },
  btnTextCancel: { fontSize: 14, fontWeight: '600', color: colors.neutral.gray600 },
  btnTextSave: { fontSize: 14, fontWeight: '700', color: colors.neutral.white },
});
