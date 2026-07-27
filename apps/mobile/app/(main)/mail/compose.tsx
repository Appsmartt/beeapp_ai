import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  ChevronDown,
  Paperclip,
  Send,
  X,
  FileText,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { SENDER_ACCOUNTS } from '../../../src/mocks/emails';


export default function MailComposeScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  // Populate pre-defined parameters if replied/forwarded
  const initialTo = (params.to as string) || '';
  const initialSubject = (params.subject as string) || '';

  const [sender, setSender] = useState(SENDER_ACCOUNTS[0]);
  const [senderDropdownVisible, setSenderDropdownVisible] = useState(false);

  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleAddAttachment = () => {
    const mockFiles = ['Reporte_Q3_Consultoria.pdf', 'Resumen_Ejecutivo.docx', 'Factura_Servicios.pdf'];
    const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    if (attachments.includes(randomFile)) {
      alert('El archivo ya está adjunto.');
      return;
    }
    setAttachments([...attachments, randomFile]);
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSend = () => {
    if (!to.trim()) {
      alert('Especifica al menos un destinatario (Para).');
      return;
    }
    if (!subject.trim()) {
      alert('El asunto está vacío.');
      return;
    }
    
    alert('Correo enviado con éxito.');
    router.replace('/(main)/mail');
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Redactar Correo</Text>
          <TouchableOpacity onPress={handleSend} style={styles.sendHeaderBtn} activeOpacity={0.8}>
            <Send size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Remitente dropdown selector */}
          <View style={styles.inputRow}>
            <Text style={styles.rowLabel}>De:</Text>
            <TouchableOpacity
              style={styles.senderSelectBox}
              onPress={() => setSenderDropdownVisible(!senderDropdownVisible)}
              activeOpacity={0.8}
            >
              <Text style={styles.senderText} numberOfLines={1}>{sender}</Text>
              <ChevronDown size={14} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </View>

          {senderDropdownVisible && (
            <View style={styles.dropdownBox}>
              {SENDER_ACCOUNTS.map((acc) => (
                <TouchableOpacity
                  key={acc}
                  style={[styles.dropdownItem, sender === acc && styles.dropdownItemActive]}
                  onPress={() => {
                    setSender(acc);
                    setSenderDropdownVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownText, sender === acc && styles.dropdownTextActive]}>
                    {acc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Para recipient input */}
          <View style={styles.inputRow}>
            <Text style={styles.rowLabel}>Para:</Text>
            <TextInput
              style={styles.textInputField}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={colors.neutral.gray500}
              autoCapitalize="none"
              keyboardType="email-address"
              value={to}
              onChangeText={setTo}
            />
            <TouchableOpacity
              onPress={() => setShowCcBcc(!showCcBcc)}
              style={styles.ccBccToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.ccBccToggleText}>{showCcBcc ? 'Ocultar CC' : 'CC/CCO'}</Text>
            </TouchableOpacity>
          </View>

          {/* Collapsible CC / CCO inputs */}
          {showCcBcc && (
            <View style={styles.ccBccSection}>
              <View style={styles.inputRow}>
                <Text style={styles.rowLabel}>CC:</Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="copia@ejemplo.com"
                  placeholderTextColor={colors.neutral.gray500}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={cc}
                  onChangeText={setCc}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.rowLabel}>CCO:</Text>
                <TextInput
                  style={styles.textInputField}
                  placeholder="copiaoculta@ejemplo.com"
                  placeholderTextColor={colors.neutral.gray500}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={bcc}
                  onChangeText={setBcc}
                />
              </View>
            </View>
          )}

          {/* Asunto input */}
          <View style={styles.inputRow}>
            <Text style={styles.rowLabel}>Asunto:</Text>
            <TextInput
              style={styles.textInputField}
              placeholder="Asunto del correo"
              placeholderTextColor={colors.neutral.gray500}
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Body Text multiline input */}
          <TextInput
            style={styles.bodyInputField}
            placeholder="Escribe tu correo electrónico aquí..."
            placeholderTextColor={colors.neutral.gray500}
            multiline
            value={body}
            onChangeText={setBody}
          />

          {/* Attachment list layout */}
          {attachments.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Text style={styles.attachmentTitle}>Archivos Adjuntos</Text>
              <View style={styles.attachmentListCol}>
                {attachments.map((file, idx) => (
                  <View key={idx} style={styles.attachmentCard}>
                    <FileText size={16} color={colors.neutral.gray600} style={{ marginRight: 8 }} />
                    <Text style={styles.attachmentNameText} numberOfLines={1}>
                      {file}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(idx)}
                      style={styles.removeBtn}
                      activeOpacity={0.7}
                    >
                      <X size={14} color={colors.semantic.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick attachment control bar */}
          <View style={styles.attachmentBar}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={handleAddAttachment}
              activeOpacity={0.8}
            >
              <Paperclip size={16} color={colors.brand.primary} style={{ marginRight: 6 }} />
              <Text style={styles.attachBtnText}>Adjuntar archivo</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Tab Menu bar */}
        {!router.embedded && <FloatingTabBar activeTab="home" />}
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
    paddingHorizontal: 16,
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
  },
  sendHeaderBtn: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.gray600,
    width: 60,
  },
  senderSelectBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  senderText: {
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  dropdownBox: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: 6,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#F9F5FF',
  },
  dropdownText: {
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  dropdownTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  textInputField: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    paddingVertical: 2,
    fontWeight: '600',
  },
  ccBccToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.neutral.gray100,
  },
  ccBccToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  ccBccSection: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 4,
  },
  bodyInputField: {
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
    minHeight: 180,
    marginTop: 10,
    textAlignVertical: 'top',
  },
  attachmentsSection: {
    marginTop: 20,
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  attachmentTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  attachmentListCol: {
    gap: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  attachmentNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
    flex: 1,
  },
  removeBtn: {
    padding: 4,
  },
  attachmentBar: {
    marginTop: 16,
    alignItems: 'flex-start',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
});
