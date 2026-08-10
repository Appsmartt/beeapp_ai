import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check } from 'lucide-react-native';
import { getItems, setItems, StorageItem } from '../../../src/stores/storageStore';
import SignatureCreatorCard, { SignatureMode } from '../../../src/components/storage/SignatureCreatorCard';
import SignatureDocPreview from '../../../src/components/storage/SignatureDocPreview';

export default function SignDocumentScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const fileId = params.id as string;

  const [fileItem, setFileItem] = useState<StorageItem | null>(null);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>('draw');
  const [isDrawn, setIsDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState<'bottom-left' | 'bottom-right'>('bottom-right');

  useEffect(() => {
    if (fileId) {
      const found = getItems().find((item) => item.id === fileId);
      if (found) setFileItem(found);
    }
  }, [fileId]);

  if (!fileItem) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Archivo no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  const handleModeChange = (newMode: SignatureMode) => {
    setSignatureMode(newMode);
    if (newMode === 'saved') {
      setIsDrawn(true);
      setIsPositioned(true);
    }
  };

  const handleSimulateDraw = () => {
    setIsDrawn(true);
    setIsPositioned(true);
  };

  const handleClearDraw = () => {
    setIsDrawn(false);
    if (signatureMode === 'draw') setIsPositioned(false);
  };

  const handleSimulateUpload = () => {
    setUploadedImage('firma_subida.png');
    setIsPositioned(true);
  };

  const handleClearUpload = () => {
    setUploadedImage(null);
    if (signatureMode === 'upload') setIsPositioned(false);
  };

  const handleConfirmSignature = () => {
    if (signatureMode === 'draw' && !isDrawn) {
      Alert.alert('Firma requerida', 'Por favor dibuja tu firma o selecciona una firma guardada.');
      return;
    }
    if (signatureMode === 'upload' && !uploadedImage) {
      Alert.alert('Firma requerida', 'Por favor sube la imagen de tu firma.');
      return;
    }
    if (!isPositioned) {
      Alert.alert('Posición requerida', 'Por favor posiciona tu firma sobre el documento.');
      return;
    }

    const today = new Date();
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const formattedDate = `${dateStr}, ${timeStr}`;

    const updated = getItems().map((item) => {
      if (item.id === fileItem.id) {
        return {
          ...item,
          isSigned: true,
          signerName: 'Santiago Valencia',
          signedAt: formattedDate,
        };
      }
      return item;
    });

    setItems(updated);

    Alert.alert(
      'Documento Firmado',
      'El NDA ha sido firmado digitalmente y se ha generado el sello de auditoría de BeeAI.',
      [
        {
          text: 'Entendido',
          onPress: () => {
            router.replace({ pathname: '/(main)/storage' });
          },
        },
      ]
    );
  };

  const isReadyToSign =
    (signatureMode === 'saved' || (signatureMode === 'draw' && isDrawn) || (signatureMode === 'upload' && !!uploadedImage)) &&
    isPositioned;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Firmar Documento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SignatureDocPreview
            fileItem={fileItem}
            isPositioned={isPositioned}
            signaturePosition={signaturePosition}
            onPositionChange={setSignaturePosition}
          />

          <Text style={styles.sectionTitle}>Crea tu Firma</Text>
          <SignatureCreatorCard
            mode={signatureMode}
            onModeChange={handleModeChange}
            isDrawn={isDrawn}
            onSimulateDraw={handleSimulateDraw}
            onClearDraw={handleClearDraw}
            uploadedImage={uploadedImage}
            onSimulateUpload={handleSimulateUpload}
            onClearUpload={handleClearUpload}
          />

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Confirmation Footer Bar */}
        <View style={styles.footerBar}>
          <TouchableOpacity
            style={[styles.signConfirmBtn, !isReadyToSign && styles.signConfirmBtnDisabled]}
            disabled={!isReadyToSign}
            onPress={handleConfirmSignature}
            activeOpacity={0.8}
          >
            <Check size={20} color={colors.neutral.white} />
            <Text style={styles.signConfirmBtnText}>Firmar Documento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  footerBar: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    padding: 16,
  },
  signConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  signConfirmBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  signConfirmBtnText: { color: colors.neutral.white, fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 14, color: colors.brand.primary, fontWeight: '600' },
});
