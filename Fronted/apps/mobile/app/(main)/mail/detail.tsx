import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Star,
  Trash2,
  Archive,
  CornerUpLeft,
  ReplyAll,
  CornerUpRight,
  FileText,
  Download,
  Mail,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { MOCK_EMAILS } from '../../../src/mocks/emails';


export default function MailDetailScreen() {
  const router = useModuleNav();
  const { id } = useScreenParams();

  // Mock Emails pool
  const emails = MOCK_EMAILS;

  const email = emails.find((e) => e.id === id) || emails[0];
  
  const [starred, setStarred] = useState(email.isStarred);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleDownload = (fileName: string) => {
    alert(`Descargando archivo: ${fileName}`);
  };

  const handleAction = (action: string) => {
    alert(`Acción simulada: ${action}`);
    router.back();
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header toolbar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>

          <View style={styles.headerRightCol}>
            <TouchableOpacity onPress={() => setStarred(!starred)} style={styles.toolbarBtn} activeOpacity={0.7}>
              <Star
                size={20}
                color={starred ? '#F59E0B' : colors.neutral.text}
                fill={starred ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleAction('Archivar')} style={styles.toolbarBtn} activeOpacity={0.7}>
              <Archive size={20} color={colors.neutral.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleAction('Eliminar')} style={styles.toolbarBtn} activeOpacity={0.7}>
              <Trash2 size={20} color={colors.semantic.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Account line info */}
          <View style={styles.accountHeaderBox}>
            <Mail size={12} color={colors.neutral.gray600} style={{ marginRight: 6 }} />
            <Text style={styles.accountHeaderText}>Cuenta: {email.account}</Text>
          </View>

          {/* Subject Line */}
          <Text style={styles.subjectText}>{email.subject}</Text>

          {/* Sender row metadata */}
          <View style={styles.senderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: email.initialsColor }]}>
              <Text style={styles.avatarText}>{getInitials(email.senderName)}</Text>
            </View>
            <View style={styles.senderDetails}>
              <View style={styles.senderNameRow}>
                <Text style={styles.senderName}>{email.senderName}</Text>
                {email.senderVerified && <VerifiedBadge size={14} />}
              </View>
              <Text style={styles.senderEmail}>De: {email.senderEmail}</Text>
              <Text style={styles.receiverEmail}>Para: mí</Text>
            </View>
            <Text style={styles.dateText}>{email.date} • {email.time}</Text>
          </View>

          <View style={styles.divider} />

          {/* Email Body */}
          <Text style={styles.emailBodyText}>{email.body}</Text>

          <View style={styles.divider} />

          {/* Attachments Section */}
          {email.hasAttachment && email.attachments && (
            <View style={styles.attachmentsBox}>
              <Text style={styles.attachmentsTitle}>Archivos Adjuntos ({email.attachments.length})</Text>
              <View style={styles.attachmentsListCol}>
                {email.attachments.map((file, idx) => (
                  <View key={idx} style={styles.fileCard}>
                    <View style={styles.fileIconBox}>
                      <FileText size={18} color={colors.neutral.gray600} />
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileNameText} numberOfLines={1}>
                        {file}
                      </Text>
                      <Text style={styles.fileSizeText}>Documento PDF (1.2 MB)</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDownload(file)}
                      style={styles.downloadBtn}
                      activeOpacity={0.7}
                    >
                      <Download size={16} color={colors.brand.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reply actions buttons bar */}
          <View style={styles.replyActionsRow}>
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => router.push({ pathname: '/(main)/mail/compose', params: { to: email.senderEmail, subject: `Re: ${email.subject}` } })}
              activeOpacity={0.8}
            >
              <CornerUpLeft size={16} color={colors.neutral.text} style={{ marginRight: 6 }} />
              <Text style={styles.replyBtnText}>Responder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => router.push({ pathname: '/(main)/mail/compose', params: { to: email.senderEmail, subject: `Re: ${email.subject}` } })}
              activeOpacity={0.8}
            >
              <ReplyAll size={16} color={colors.neutral.text} style={{ marginRight: 6 }} />
              <Text style={styles.replyBtnText}>Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() => router.push({ pathname: '/(main)/mail/compose', params: { subject: `Fwd: ${email.subject}` } })}
              activeOpacity={0.8}
            >
              <CornerUpRight size={16} color={colors.neutral.text} style={{ marginRight: 6 }} />
              <Text style={styles.replyBtnText}>Reenviar</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
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
  headerRightCol: {
    flexDirection: 'row',
    gap: 16,
  },
  toolbarBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  accountHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  accountHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '800',
  },
  senderDetails: {
    flex: 1,
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  senderName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  senderEmail: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  receiverEmail: {
    fontSize: 11,
    color: colors.neutral.gray500,
    marginTop: 1,
  },
  dateText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: 16,
  },
  emailBodyText: {
    fontSize: 14,
    color: colors.neutral.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  attachmentsBox: {
    marginBottom: 24,
  },
  attachmentsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  attachmentsListCol: {
    gap: 10,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  fileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  fileSizeText: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  replyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 12,
    paddingVertical: 12,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
});
