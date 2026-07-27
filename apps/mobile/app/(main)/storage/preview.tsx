import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Share2,
  Download,
  ShieldCheck,
  Trash2,
  Play,
  Image as ImageIcon,
} from 'lucide-react-native';
import { getItems, setItems, StorageItem } from '../../../src/stores/storageStore';

export default function FilePreviewScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const fileId = params.id as string;

  const [fileItem, setFileItem] = useState<StorageItem | null>(null);

  useEffect(() => {
    if (fileId) {
      const found = getItems().find((item) => item.id === fileId);
      if (found) {
        setFileItem(found);
      }
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

  const handleDelete = () => {
    const updated = getItems().filter((item) => item.id !== fileItem.id);
    setItems(updated);
    alert('Archivo eliminado con éxito.');
    router.back();
  };

  const handleShare = () => {
    alert('Enlace de descarga copiado al portapapeles.');
  };

  const handleDownload = () => {
    alert('Archivo guardado en descargas locales.');
  };

  const handleSignRedirect = () => {
    router.push({
      pathname: '/(main)/storage/sign',
      params: { id: fileItem.id },
    });
  };

  const renderPreviewBody = () => {
    if (fileItem.type === 'image') {
      return (
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imageMock}>
            <ImageIcon size={48} color={colors.neutral.gray500} />
            <Text style={styles.mockText}>Previsualización de Imagen</Text>
            <Text style={styles.mockSub}>{fileItem.size}</Text>
          </View>
        </View>
      );
    }
    if (fileItem.type === 'video') {
      return (
        <View style={styles.videoPreviewContainer}>
          <View style={styles.videoPlayerMock}>
            <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
              <Play size={24} color={colors.neutral.white} fill={colors.neutral.white} />
            </TouchableOpacity>
            {/* Playback seek bar */}
            <View style={styles.progressBarRow}>
              <Text style={styles.timeLabel}>0:00</Text>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.timeLabel}>2:15</Text>
            </View>
          </View>
        </View>
      );
    }
    // PDF / DOC
    return (
      <ScrollView style={styles.documentScrollView} contentContainerStyle={styles.documentContent}>
        <View style={styles.docPageMock}>
          <Text style={styles.docPageTitle}>{fileItem.name}</Text>
          <Text style={styles.docParagraph}>
            ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN (NDA)
          </Text>
          <Text style={styles.docParagraph}>
            Este Acuerdo de Confidencialidad (en adelante, el "Acuerdo") se celebra entre las partes firmantes con el fin de proteger la Información Confidencial intercambiada en el marco de la evaluación del software BeeApp AI.
          </Text>
          <Text style={styles.docParagraph}>
            1. Definición de Información Confidencial. A los efectos de este Acuerdo, se entenderá por "Información Confidencial" cualquier dato, planos técnicos, algoritmo, secretos industriales o comerciales compartidos entre las partes.
          </Text>
          <Text style={styles.docParagraph}>
            2. Obligación de No Divulgación. Las partes se comprometen a mantener el más estricto secreto sobre toda la información recibida y a no divulgarla a terceros sin el consentimiento expreso y por escrito de la otra parte.
          </Text>

          {/* Sello digital de la firma */}
          {fileItem.isSigned && (
            <View style={styles.signatureSeal}>
              <ShieldCheck size={20} color="#7C3AED" />
              <View>
                <Text style={styles.signatureSealTitle}>Firmado Electrónicamente con BeeAI</Text>
                <Text style={styles.signatureSealDetails}>
                  Firmante: {fileItem.signerName || 'Usuario Registrado'}
                </Text>
                <Text style={styles.signatureSealDetails}>
                  Fecha: {fileItem.signedAt || 'Hoy'}
                </Text>
                <Text style={styles.signatureSealHash}>ID Firma: SHA-256/f89e218b...</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {fileItem.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content body preview */}
        <View style={styles.previewBox}>{renderPreviewBody()}</View>

        {/* Signature details panel if signed (outside document area for better layout) */}
        {fileItem.isSigned && (
          <View style={styles.signedSummaryBanner}>
            <ShieldCheck size={18} color="#7C3AED" />
            <Text style={styles.signedSummaryText}>
              Documento validado digitalmente por {fileItem.signerName}.
            </Text>
          </View>
        )}

        {/* Action controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
            <Share2 size={20} color={colors.neutral.text} />
            <Text style={styles.actionLabel}>Compartir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleDownload} activeOpacity={0.7}>
            <Download size={20} color={colors.neutral.text} />
            <Text style={styles.actionLabel}>Descargar</Text>
          </TouchableOpacity>

          {/* Sign Button */}
          {fileItem.type === 'pdf' && !fileItem.isSigned && (
            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSignRedirect} activeOpacity={0.8}>
              <ShieldCheck size={20} color={colors.neutral.white} />
              <Text style={styles.primaryActionLabel}>Firmar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Trash2 size={20} color={colors.semantic.error} />
            <Text style={[styles.actionLabel, { color: colors.semantic.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  previewBox: {
    flex: 1,
    backgroundColor: '#1E1E2F', // Clean dark preview viewport
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContainer: {
    flex: 1,
    width: '100%',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageMock: {
    width: '100%',
    height: 300,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  mockText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.text,
    marginTop: 12,
  },
  mockSub: {
    fontSize: 12,
    color: colors.neutral.gray600,
    marginTop: 4,
  },
  videoPreviewContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoPlayerMock: {
    width: '100%',
    height: 240,
    backgroundColor: '#0F0F1A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '600',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  progressFill: {
    width: '30%',
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
  },
  documentScrollView: {
    flex: 1,
    width: '100%',
  },
  documentContent: {
    padding: 20,
  },
  docPageMock: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 24,
    minHeight: 500,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  docPageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brand.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  docParagraph: {
    fontSize: 12,
    color: colors.neutral.text,
    lineHeight: 18,
    marginBottom: 14,
    textAlign: 'justify',
  },
  signatureSeal: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signatureSealTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 4,
  },
  signatureSealDetails: {
    fontSize: 11,
    color: colors.neutral.gray700,
    fontWeight: '600',
  },
  signatureSealHash: {
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.neutral.gray600,
    marginTop: 4,
  },
  signedSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#E9D5FF',
    gap: 10,
  },
  signedSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 6,
  },
  primaryActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
