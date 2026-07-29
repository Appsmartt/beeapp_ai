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
import {
  X,
  Camera,
  Store,
  Tag,
  FileText,
  MapPin,
  Package,
  Wrench,
  Truck,
  UtensilsCrossed,
  Monitor,
} from 'lucide-react-native';
import {
  Business,
  BUSINESS_CATEGORIES,
  DeliveryMethod,
  ServiceMode,
} from '../../mocks/myServices';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: BusinessFormData) => void;
  initialData?: Business;
}

export interface BusinessFormData {
  name: string;
  logo: string | null;
  category: string;
  description: string;
  address: string;
  offersProducts: boolean;
  offersServices: boolean;
  deliveryMethods: DeliveryMethod[];
  serviceModes: ServiceMode[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DELIVERY_OPTIONS: { id: DeliveryMethod; label: string; icon: typeof Truck }[] = [
  { id: 'domicilio', label: 'Domicilio', icon: Truck },
  { id: 'recoger', label: 'Recoger en establecimiento', icon: Store },
  { id: 'consumir', label: 'Consumir en establecimiento', icon: UtensilsCrossed },
];

const SERVICE_MODE_OPTIONS: { id: ServiceMode; label: string; icon: typeof Monitor }[] = [
  { id: 'virtual', label: 'Virtual', icon: Monitor },
  { id: 'presencial', label: 'Presencial', icon: MapPin },
];

const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateBusinessModal({
  visible,
  onClose,
  onSave,
  initialData,
}: CreateBusinessModalProps) {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [offersProducts, setOffersProducts] = useState(false);
  const [offersServices, setOffersServices] = useState(false);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [serviceModes, setServiceModes] = useState<ServiceMode[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Reset fields when modal opens
  useEffect(() => {
    if (visible) {
      setName(initialData?.name ?? '');
      setLogo(initialData?.logo ?? null);
      setCategory(initialData?.category ?? '');
      setDescription(initialData?.description ?? '');
      setAddress(initialData?.address ?? '');
      setOffersProducts(initialData?.offersProducts ?? false);
      setOffersServices(initialData?.offersServices ?? false);
      setDeliveryMethods(initialData?.deliveryMethods ?? []);
      setServiceModes(initialData?.serviceModes ?? []);
      setSubmitted(false);
    }
  }, [visible, initialData]);

  const toggleDelivery = (method: DeliveryMethod) => {
    setDeliveryMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

  const toggleServiceMode = (mode: ServiceMode) => {
    setServiceModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const handleMockLogo = () => {
    setLogo('mock_business_logo');
    Alert.alert('Logo seleccionado', 'Se ha simulado la carga del logo.');
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!name.trim() || !category) return;

    onSave({
      name: name.trim(),
      logo,
      category,
      description: description.trim(),
      address: address.trim(),
      offersProducts,
      offersServices,
      deliveryMethods: offersProducts ? deliveryMethods : [],
      serviceModes: offersServices ? serviceModes : [],
    });
  };

  const nameError = submitted && !name.trim();
  const categoryError = submitted && !category;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={22} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar negocio' : 'Crear negocio'}
          </Text>
          <View style={styles.closePlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <TouchableOpacity style={styles.logoBtn} onPress={handleMockLogo} activeOpacity={0.7}>
            <View style={[styles.logoCircle, logo ? styles.logoCircleFilled : undefined]}>
              <Camera size={28} color={logo ? colors.brand.primary : colors.neutral.gray400} />
            </View>
            <Text style={styles.logoLabel}>
              {logo ? 'Cambiar logo' : 'Agregar logo'}
            </Text>
          </TouchableOpacity>

          {/* Name */}
          <FieldLabel icon={Store} text="Nombre del negocio *" />
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            placeholder="Nombre de tu negocio"
            placeholderTextColor={colors.neutral.gray400}
            value={name}
            onChangeText={setName}
          />
          {nameError && <Text style={styles.errorText}>El nombre es requerido.</Text>}

          {/* Category */}
          <FieldLabel icon={Tag} text="Categoría *" />
          <View style={styles.chipsWrap}>
            {BUSINESS_CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {categoryError && <Text style={styles.errorText}>Selecciona una categoría.</Text>}

          {/* Description */}
          <FieldLabel icon={FileText} text="Descripción" />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe de qué trata tu negocio"
            placeholderTextColor={colors.neutral.gray400}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Address */}
          <FieldLabel icon={MapPin} text="Dirección" />
          <TextInput
            style={styles.input}
            placeholder="Dirección del negocio"
            placeholderTextColor={colors.neutral.gray400}
            value={address}
            onChangeText={setAddress}
          />

          {/* Offer type */}
          <FieldLabel icon={Package} text="Tipo de oferta" />
          <View style={styles.chipsRow}>
            <OfferChip
              icon={Package}
              label="Productos"
              active={offersProducts}
              onPress={() => setOffersProducts(!offersProducts)}
            />
            <OfferChip
              icon={Wrench}
              label="Servicios"
              active={offersServices}
              onPress={() => setOffersServices(!offersServices)}
            />
          </View>

          {/* Delivery methods (products only) */}
          {offersProducts && (
            <>
              <FieldLabel icon={Truck} text="Métodos de entrega" />
              <View style={styles.chipsWrap}>
                {DELIVERY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = deliveryMethods.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, styles.chipWithIcon, isActive && styles.chipActive]}
                      onPress={() => toggleDelivery(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Icon size={14} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Service modes (services only) */}
          {offersServices && (
            <>
              <FieldLabel icon={Monitor} text="Modalidad de servicio" />
              <View style={styles.chipsWrap}>
                {SERVICE_MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = serviceModes.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.chip, styles.chipWithIcon, isActive && styles.chipActive]}
                      onPress={() => toggleServiceMode(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Icon size={14} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, (!name.trim() || !category) && styles.btnDisabled]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={submitted && (!name.trim() || !category)}
            >
              <Text style={styles.btnPrimaryText}>
                {isEditing ? 'Guardar cambios' : 'Crear negocio'}
              </Text>
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

// ─── Shared sub-components ───────────────────────────────────────────────────

function FieldLabel({ icon: Icon, text }: { icon: typeof Store; text: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Icon size={15} color={colors.neutral.gray500} />
      <Text style={styles.fieldLabel}>{text}</Text>
    </View>
  );
}

function OfferChip({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: typeof Package;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.offerChip, active && styles.offerChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon size={16} color={active ? colors.brand.primary : colors.neutral.gray600} />
      <Text style={[styles.offerChipText, active && styles.offerChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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

  // Logo
  logoBtn: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoCircleFilled: { backgroundColor: colors.brand.primary + '15' },
  logoLabel: { fontSize: FONT.caption, fontWeight: '400', color: colors.neutral.gray600 },

  // Field label
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },

  // Input
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
  multiline: { height: 100, textAlignVertical: 'top', paddingTop: 12 },

  // Chips (category, delivery, service mode)
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
  chipWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '10' },
  chipText: { fontSize: FONT.caption, fontWeight: '400', color: colors.neutral.gray600 },
  chipTextActive: { color: colors.brand.primary, fontWeight: '600' },

  // Offer type chips
  chipsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  offerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    backgroundColor: colors.neutral.white,
  },
  offerChipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary + '10' },
  offerChipText: { fontSize: FONT.body, fontWeight: '400', color: colors.neutral.gray600 },
  offerChipTextActive: { color: colors.brand.primary, fontWeight: '600' },

  // Buttons
  actionRow: { marginTop: 24, gap: 12 },
  btn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.brand.primary },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { fontSize: FONT.body, fontWeight: '600', color: colors.neutral.white },
  btnCancel: { backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.neutral.gray300 },
  btnCancelText: { fontSize: FONT.body, fontWeight: '400', color: colors.neutral.gray600 },
});
