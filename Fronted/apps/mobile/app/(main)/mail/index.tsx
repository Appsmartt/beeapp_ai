import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { Mail, SquarePen } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { EmailItem, MOCK_EMAILS } from '../../../src/mocks/emails';
import MailHeader, { MailAccountFilter } from '../../../src/components/mail/MailHeader';
import MailFolderChips, { MailFolder } from '../../../src/components/mail/MailFolderChips';
import MailListItem from '../../../src/components/mail/MailListItem';

const FAB_BOTTOM_OFFSET = 105; // Spacing offset to separate FAB from FloatingTabBar

export default function MailInboxScreen() {
  const router = useModuleNav();

  // Active accounts and selector states
  const [activeAccount, setActiveAccount] = useState<MailAccountFilter>('all');
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  // Search moved to the global Home search bar: the module keeps the filter dormant
  const [searchQuery] = useState('');
  const [swipeActiveId, setSwipeActiveId] = useState<string | null>(null);

  // Mock Emails state
  const [emails, setEmails] = useState<EmailItem[]>(MOCK_EMAILS);

  const handleToggleStar = (id: string, e: any) => {
    e.stopPropagation();
    setEmails(
      emails.map((email) =>
        email.id === id ? { ...email, isStarred: !email.isStarred } : email
      )
    );
  };

  const handleToggleRead = (id: string, e: any) => {
    e.stopPropagation();
    setEmails(
      emails.map((email) =>
        email.id === id ? { ...email, isRead: !email.isRead } : email
      )
    );
    setSwipeActiveId(null);
  };

  const handleDeleteMail = (id: string, e: any) => {
    e.stopPropagation();
    setEmails(
      emails.map((email) =>
        email.id === id ? { ...email, folder: 'trash' } : email
      )
    );
    setSwipeActiveId(null);
    alert('Correo movido a la Papelera.');
  };

  const handleArchiveMail = (id: string, e: any) => {
    e.stopPropagation();
    // Simulate archiving by just changing folder state or hiding it
    setEmails(emails.filter((m) => m.id !== id));
    setSwipeActiveId(null);
    alert('Correo archivado con éxito.');
  };

  const handleSelectAccount = (account: MailAccountFilter) => {
    setActiveAccount(account);
    setAccountMenuVisible(false);
  };

  // Filter logic based on Folder, Account and Search
  const filteredEmails = emails.filter((mail) => {
    // 1. Account Filter
    if (activeAccount !== 'all' && mail.account !== activeAccount) return false;

    // 2. Folder Filter
    if (activeFolder === 'unread') {
      if (mail.isRead || mail.folder !== 'inbox') return false;
    } else if (activeFolder === 'starred') {
      if (!mail.isStarred || mail.folder === 'trash') return false;
    } else {
      if (mail.folder !== activeFolder) return false;
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        mail.senderName.toLowerCase().includes(query) ||
        mail.subject.toLowerCase().includes(query) ||
        mail.bodyPreview.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getUnreadCount = (folder: string) => {
    return emails.filter((m) => {
      if (activeAccount !== 'all' && m.account !== activeAccount) return false;
      if (folder === 'unread') return !m.isRead && m.folder === 'inbox';
      if (folder === 'starred') return m.isStarred && m.folder !== 'trash';
      return !m.isRead && m.folder === folder;
    }).length;
  };

  const hasEmails = filteredEmails.length > 0;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <MailHeader
          activeAccount={activeAccount}
          menuVisible={accountMenuVisible}
          onToggleMenu={() => setAccountMenuVisible(!accountMenuVisible)}
          onSelectAccount={handleSelectAccount}
          onBack={router.canGoBack ? () => router.back() : undefined}
          onCompose={router.embedded ? () => router.push('/(main)/mail/compose') : undefined}
          onConnectAccount={() => {
            setAccountMenuVisible(false);
            router.push('/(main)/profile/integrations');
          }}
        />

        {/* Folder Navigation Chips */}
        <MailFolderChips
          activeFolder={activeFolder}
          onFolderChange={(folder) => {
            setActiveFolder(folder);
            setSwipeActiveId(null);
          }}
          getUnreadCount={getUnreadCount}
        />

        {/* Mails Scroll View List */}
        {hasEmails ? (
          <ScrollView style={styles.mailListScroll} showsVerticalScrollIndicator={false}>
            {filteredEmails.map((item) => {
              const isSwipeActive = swipeActiveId === item.id;
              return (
                <MailListItem
                  key={item.id}
                  item={item}
                  isSwipeActive={isSwipeActive}
                  onPress={() => {
                    // Navigate to detail
                    router.push({
                      pathname: '/(main)/mail/detail',
                      params: { id: item.id },
                    });
                  }}
                  onLongPress={() => setSwipeActiveId(isSwipeActive ? null : item.id)}
                  onToggleStar={(e) => handleToggleStar(item.id, e)}
                  onToggleRead={(e) => handleToggleRead(item.id, e)}
                  onArchive={(e) => handleArchiveMail(item.id, e)}
                  onDelete={(e) => handleDeleteMail(item.id, e)}
                />
              );
            })}
            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          // Empty folder layout
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Mail size={40} color={colors.neutral.gray500} />
            </View>
            <Text style={styles.emptyTitle}>Bandeja Vacía</Text>
            <Text style={styles.emptyDesc}>
              No hay correos en esta carpeta que coincidan con los filtros activos.
            </Text>
          </View>
        )}

        {/* Compose Floating Action Button (standalone only: embedded it lives in the header) */}
        {!router.embedded && (
        <TouchableOpacity
          style={styles.composeFab}
          onPress={() => router.push('/(main)/mail/compose')}
          activeOpacity={0.8}
        >
          <SquarePen size={20} color={colors.neutral.white} style={{ marginRight: 6 }} />
          <Text style={styles.composeFabText}>Redactar</Text>
        </TouchableOpacity>
        )}

        {/* Navigation Floating Tab bar */}
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
  mailListScroll: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
  composeFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  composeFabText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
