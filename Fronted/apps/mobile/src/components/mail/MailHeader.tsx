import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronDown,
  Inbox,
  Mail,
  RefreshCw,
  Settings,
  SquarePen,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ModuleNotificationBell from '../ModuleNotificationBell';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MailAccountFilter = 'all' | string;

export interface MailAccountOption {
  id: string;
  label: string;
  provider: 'google' | 'microsoft';
  isActive: boolean;
}

interface MailHeaderProps {
  activeAccount: MailAccountFilter;
  accounts: MailAccountOption[];
  menuVisible: boolean;
  syncing?: boolean;
  onToggleMenu: () => void;
  onSelectAccount: (
    account: MailAccountFilter,
  ) => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onCompose?: () => void;
  onConnectAccount: () => void;
  onManageExternalMail: () => void;
}

function getProviderColor(
  provider: MailAccountOption['provider'],
): string {
  return provider === 'google'
    ? '#4285F4'
    : '#0078D4';
}

export default function MailHeader({
  activeAccount,
  accounts,
  menuVisible,
  syncing = false,
  onToggleMenu,
  onSelectAccount,
  onRefresh,
  onBack,
  onCompose,
  onConnectAccount,
  onManageExternalMail,
}: MailHeaderProps) {
  const activeAccountLabel = activeAccount === 'all'
    ? 'Todas las cuentas'
    : (
      accounts.find(
        (account) => account.id === activeAccount,
      )?.label
      || 'Cuenta seleccionada'
    );

  return (
    <>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSideSlot} />
        )}

        <TouchableOpacity
          style={styles.accountSelectorBtn}
          onPress={onToggleMenu}
          activeOpacity={0.8}
        >
          <Text
            style={styles.accountNameText}
            numberOfLines={1}
          >
            {activeAccountLabel}
          </Text>

          <ChevronDown
            size={16}
            color={colors.neutral.gray600}
            style={styles.accountChevron}
          />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <ModuleNotificationBell moduleId="mail" />

          {onRefresh ? (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={syncing}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <RefreshCw
                size={17}
                color={colors.brand.primary}
              />
            </TouchableOpacity>
          ) : null}

          {onCompose ? (
            <TouchableOpacity
              onPress={onCompose}
              style={styles.headerActionBtn}
              activeOpacity={0.7}
            >
              <SquarePen
                size={18}
                color={colors.brand.primary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {menuVisible ? (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              activeAccount === 'all'
                && styles.dropdownItemActive,
            ]}
            onPress={() => onSelectAccount('all')}
            activeOpacity={0.7}
          >
            <Inbox
              size={16}
              color={
                activeAccount === 'all'
                  ? colors.brand.primary
                  : colors.neutral.gray600
              }
            />

            <Text
              style={[
                styles.dropdownText,
                activeAccount === 'all'
                  && styles.dropdownTextActive,
              ]}
            >
              Todas las cuentas
            </Text>
          </TouchableOpacity>

          {accounts.map((account) => {
            const isSelected = activeAccount === account.id;
            const providerColor = getProviderColor(
              account.provider,
            );

            return (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.dropdownItem,
                  isSelected
                    && styles.dropdownItemActive,
                ]}
                onPress={() => onSelectAccount(account.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.accountDot,
                    {
                      backgroundColor: providerColor,
                      opacity: account.isActive ? 1 : 0.45,
                    },
                  ]}
                />

                <View style={styles.accountTextColumn}>
                  <Text
                    style={[
                      styles.dropdownText,
                      isSelected
                        && styles.dropdownTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {account.label}
                  </Text>

                  {!account.isActive ? (
                    <Text style={styles.inactiveText}>
                      Requiere reconexión
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.dropdownDivider} />

          <TouchableOpacity
            style={styles.dropdownItemLink}
            onPress={onManageExternalMail}
            activeOpacity={0.7}
          >
            <Mail
              size={14}
              color={colors.brand.primary}
              style={styles.settingsIcon}
            />

            <View style={styles.dropdownLinkContent}>
              <Text style={styles.dropdownLinkText}>
                Correo externo
              </Text>

              <Text style={styles.dropdownLinkDescription}>
                Revisar cuentas y sincronización
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItemLink}
            onPress={onConnectAccount}
            activeOpacity={0.7}
          >
            <Settings
              size={14}
              color={colors.brand.primary}
              style={styles.settingsIcon}
            />

            <Text style={styles.dropdownLinkText}>
              Conectar otra cuenta
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${colors.brand.primary}15`,
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
    maxWidth: SCREEN_WIDTH * 0.52,
  },
  accountNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  accountChevron: {
    marginLeft: 6,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    backgroundColor: `${colors.brand.primary}15`,
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
  accountTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  inactiveText: {
    marginLeft: 12,
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray500,
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
  settingsIcon: {
    marginRight: 8,
  },
  dropdownLinkText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  dropdownLinkContent: {
    flex: 1,
  },
  dropdownLinkDescription: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    color: colors.neutral.gray500,
  },
});