
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ChevronDown, Inbox, Settings, SquarePen } from 'lucide-react-native';
import ModuleNotificationBell from '../ModuleNotificationBell';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MailAccountFilter = 'all' | 'santiago.valencia@consultores.com' | 'ventas@empresa.com';

interface MailHeaderProps {
  activeAccount: MailAccountFilter;
  menuVisible: boolean;
  onToggleMenu: () => void;
  onSelectAccount: (account: MailAccountFilter) => void;
  /** Omitted when there is nothing to go back to (root of an embedded module) */
  onBack?: () => void;
  /** Compose action shown in the header while embedded (instead of a floating button) */
  onCompose?: () => void;
  onConnectAccount: () => void;
}

export default function MailHeader({
  activeAccount,
  menuVisible,
  onToggleMenu,
  onSelectAccount,
  onBack,
  onCompose,
  onConnectAccount,
}: MailHeaderProps) {
  return (
    <>
      {/* Header with selector */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSideSlot} />
        )}

        <TouchableOpacity style={styles.accountSelectorBtn} onPress={onToggleMenu} activeOpacity={0.8}>
          <Text style={styles.accountNameText} numberOfLines={1}>
            {activeAccount === 'all' ? 'Todas las cuentas' : activeAccount}
          </Text>
          <ChevronDown size={16} color={colors.neutral.gray600} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ModuleNotificationBell moduleId="mail" />
          {onCompose ? (
            <TouchableOpacity onPress={onCompose} style={styles.headerActionBtn} activeOpacity={0.7}>
              <SquarePen size={18} color={colors.brand.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSideSlot} />
          )}
        </View>
      </View>

      {/* Dropdown Account Selector Menu */}
      {menuVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={[styles.dropdownItem, activeAccount === 'all' && styles.dropdownItemActive]}
            onPress={() => onSelectAccount('all')}
            activeOpacity={0.7}
          >
            <Inbox size={16} color={activeAccount === 'all' ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.dropdownText, activeAccount === 'all' && styles.dropdownTextActive]}>Todas las cuentas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, activeAccount === 'santiago.valencia@consultores.com' && styles.dropdownItemActive]}
            onPress={() => onSelectAccount('santiago.valencia@consultores.com')}
            activeOpacity={0.7}
          >
            <View style={[styles.accountDot, { backgroundColor: colors.brand.primary }]} />
            <Text style={[styles.dropdownText, activeAccount === 'santiago.valencia@consultores.com' && styles.dropdownTextActive]} numberOfLines={1}>
              santiago.valencia@consultores.com
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dropdownItem, activeAccount === 'ventas@empresa.com' && styles.dropdownItemActive]}
            onPress={() => onSelectAccount('ventas@empresa.com')}
            activeOpacity={0.7}
          >
            <View style={[styles.accountDot, { backgroundColor: colors.neutral.gray500 }]} />
            <Text style={[styles.dropdownText, activeAccount === 'ventas@empresa.com' && styles.dropdownTextActive]} numberOfLines={1}>
              ventas@empresa.com
            </Text>
          </TouchableOpacity>

          <View style={styles.dropdownDivider} />
          <TouchableOpacity style={styles.dropdownItemLink} onPress={onConnectAccount} activeOpacity={0.7}>
            <Settings size={14} color={colors.brand.primary} style={{ marginRight: 8 }} />
            <Text style={styles.dropdownLinkText}>Conectar otra cuenta</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  headerSideSlot: {
    width: 32,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    maxWidth: SCREEN_WIDTH * 0.6,
  },
  accountNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: colors.brand.primary + '15',
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
    marginLeft: 12,
    flex: 1,
  },
  dropdownTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: 4,
  },
  dropdownItemLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownLinkText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.brand.primary,
  },
});
