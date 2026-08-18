import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useRouter,
} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlink,
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useIntegrations } from '../../../src/hooks/useIntegrations';
import {
  buildConnectionPresentations,
  isReconnectable,
  PROVIDER_OPTIONS,
  type IntegrationConnectionPresentation,
  type ProviderOption,
} from '../../../src/services/integrationsService';


function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'Inténtalo nuevamente.';
}


export default function IntegrationsScreen() {
  const router = useRouter();

  const {
    connections,
    loading,
    refreshing,
    error,
    loadIntegrations,
    startAuthorization,
    reauthorize,
    disconnect,
    removeConnectionRecord,
  } = useIntegrations();

  const [isProviderModalVisible, setIsProviderModalVisible] =
    useState(false);

  const [selectedConnection, setSelectedConnection] =
    useState<IntegrationConnectionPresentation | null>(
      null,
    );

  const [actionId, setActionId] = useState<string | null>(
    null,
  );

  const connectionItems = useMemo(
    () => buildConnectionPresentations(connections),
    [connections],
  );

  useFocusEffect(
    useCallback(() => {
      void loadIntegrations(true);
    }, [loadIntegrations]),
  );

  const openAuthorizationUrl = async (
    authorizationUrl: string,
  ) => {
    try {
      await WebBrowser.openBrowserAsync(
        authorizationUrl,
        {
          showTitle: true,
          enableBarCollapsing: true,
        },
      );
    } catch (browserError) {
      Alert.alert(
        'No fue posible abrir el proveedor',
        getErrorMessage(browserError),
      );
    } finally {
      setIsProviderModalVisible(false);
      setSelectedConnection(null);
      await loadIntegrations(true);
    }
  };

  const handleProviderPress = async (
    provider: ProviderOption,
  ) => {
    if (provider.availability !== 'available') {
      Alert.alert(
        'Próximamente',
        'Esta integración todavía no está disponible.',
      );
      return;
    }

    try {
      setActionId(`provider:${provider.provider}`);

      const authorizationUrl = await startAuthorization(
        provider.provider,
        [],
      );

      await openAuthorizationUrl(authorizationUrl);
    } catch (connectError) {
      Alert.alert(
        'No fue posible iniciar la conexión',
        getErrorMessage(connectError),
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReauthorize = async (
    item: IntegrationConnectionPresentation,
  ) => {
    try {
      setActionId(item.id);

      const authorizationUrl = await reauthorize(
        item.connection.id,
        item.connection.capabilities,
      );

      await openAuthorizationUrl(authorizationUrl);
    } catch (reauthorizeError) {
      Alert.alert(
        'No fue posible iniciar la reconexión',
        getErrorMessage(reauthorizeError),
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDisconnect = (
    item: IntegrationConnectionPresentation,
  ) => {
    Alert.alert(
      `Desconectar ${item.providerName}`,
      (
        `Se eliminará la autorización de ${item.accountLabel} `
        + 'guardada en BeeApp. Podrás vincularla nuevamente '
        + 'cuando quieras.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setActionId(item.id);

                await disconnect(item.connection.id);

                setSelectedConnection(null);
              } catch (disconnectError) {
                Alert.alert(
                  'No fue posible desconectar',
                  getErrorMessage(disconnectError),
                );
              } finally {
                setActionId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const handleDeleteRecord = (
    item: IntegrationConnectionPresentation,
  ) => {
    Alert.alert(
      'Eliminar cuenta de la lista',
      (
        `${item.accountLabel} dejará de aparecer en BeeApp. `
        + 'La cuenta ya está desconectada y sus credenciales '
        + 'no se conservan.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setActionId(item.id);

                await removeConnectionRecord(
                  item.connection.id,
                );

                setSelectedConnection(null);
              } catch (deleteError) {
                Alert.alert(
                  'No fue posible eliminar la cuenta',
                  getErrorMessage(deleteError),
                );
              } finally {
                setActionId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const renderConnectionItem = (
    item: IntegrationConnectionPresentation,
  ) => {
    const isActing = actionId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.connectionCard}
        onPress={() => setSelectedConnection(item)}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.providerAvatar,
            {
              backgroundColor: item.providerIconColor,
            },
          ]}
        >
          <Text style={styles.providerAvatarText}>
            {item.providerIconLetter}
          </Text>
        </View>

        <View style={styles.connectionInfo}>
          <Text
            style={styles.connectionAccount}
            numberOfLines={1}
          >
            {item.accountLabel}
          </Text>

          <View style={styles.connectionMetaRow}>
            <Text style={styles.connectionProvider}>
              {item.providerName}
            </Text>

            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.statusColor,
                },
              ]}
            />

            <Text
              style={[
                styles.connectionStatus,
                {
                  color: item.statusColor,
                },
              ]}
              numberOfLines={1}
            >
              {isActing
                ? 'Actualizando...'
                : item.statusLabel}
            </Text>
          </View>

          <Text
            style={styles.connectionHelper}
            numberOfLines={1}
          >
            {item.helperText}
          </Text>
        </View>

        <ChevronRight
          size={20}
          color={colors.neutral.gray400}
        />
      </TouchableOpacity>
    );
  };

  const selectedConnectionIsConnected = (
    selectedConnection?.status === 'connected'
  );

  const selectedConnectionCanReconnect = selectedConnection
    ? isReconnectable(selectedConnection.status)
    : false;

  const selectedConnectionCanDelete = selectedConnection
    ? selectedConnection.status !== 'connected'
    : false;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Integraciones Externas
          </Text>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => {
              void loadIntegrations(true);
            }}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />
            ) : (
              <RefreshCw
                size={19}
                color={colors.brand.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingText}>
              Cargando integraciones...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void loadIntegrations(true);
                }}
                tintColor={colors.brand.primary}
              />
            )}
          >
            <Text style={styles.subtitle}>
              Vincula cuentas externas para usar sus permisos
              de forma segura en BeeApp. Nunca guardamos tu
              contraseña.
            </Text>

            <TouchableOpacity
              style={styles.linkAccountButton}
              onPress={() => setIsProviderModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.linkAccountIcon}>
                <Plus
                  size={20}
                  color={colors.neutral.white}
                />
              </View>

              <View style={styles.linkAccountTextColumn}>
                <Text style={styles.linkAccountTitle}>
                  Vincular cuenta
                </Text>

                <Text style={styles.linkAccountDescription}>
                  Conecta Google, Microsoft y más proveedores.
                </Text>
              </View>

              <ArrowRight
                size={20}
                color={colors.neutral.white}
              />
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <AlertTriangle
                  size={18}
                  color="#B45309"
                />

                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>
                    No fue posible actualizar
                  </Text>

                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Cuentas vinculadas
              </Text>

              <Text style={styles.sectionCount}>
                {connectionItems.length}
              </Text>
            </View>

            {connectionItems.length > 0 ? (
              <View style={styles.connectionList}>
                {connectionItems.map(renderConnectionItem)}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Link2
                    size={24}
                    color={colors.brand.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  Aún no tienes cuentas vinculadas
                </Text>

                <Text style={styles.emptyDescription}>
                  Vincula una cuenta para permitir que BeeApp
                  use sus permisos cuando los necesites.
                </Text>
              </View>
            )}

            <View style={styles.securityBox}>
              <ShieldCheck
                size={21}
                color={colors.brand.primary}
              />

              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>
                  Autorizaciones protegidas
                </Text>

                <Text style={styles.securityText}>
                  Las credenciales se guardan cifradas y puedes
                  gestionar cada cuenta individualmente.
                </Text>
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </ScrollView>
        )}

        <FloatingTabBar activeTab="profile" />

        <Modal
          transparent
          visible={isProviderModalVisible}
          animationType="slide"
          onRequestClose={() => setIsProviderModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.providerSheet}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>
                    Vincular una cuenta
                  </Text>

                  <Text style={styles.sheetSubtitle}>
                    Elige el proveedor que deseas conectar.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsProviderModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <X
                    size={20}
                    color={colors.neutral.gray600}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.providerOptions}>
                {PROVIDER_OPTIONS.map((provider) => {
                  const isAvailable =
                    provider.availability === 'available';

                  const isActing = (
                    actionId
                    === `provider:${provider.provider}`
                  );

                  return (
                    <TouchableOpacity
                      key={provider.provider}
                      style={[
                        styles.providerOption,
                        !isAvailable
                          && styles.providerOptionDisabled,
                      ]}
                      onPress={() => {
                        void handleProviderPress(provider);
                      }}
                      disabled={!isAvailable || isActing}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.providerOptionIcon,
                          {
                            backgroundColor: provider.iconColor,
                          },
                        ]}
                      >
                        <Text style={styles.providerOptionIconText}>
                          {provider.iconLetter}
                        </Text>
                      </View>

                      <View style={styles.providerOptionText}>
                        <View style={styles.providerNameRow}>
                          <Text style={styles.providerOptionName}>
                            {provider.name}
                          </Text>

                          {!isAvailable ? (
                            <Text style={styles.comingSoonTag}>
                              Próximamente
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.providerOptionDescription}>
                          {provider.capabilitiesLabel}
                        </Text>
                      </View>

                      {isActing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.brand.primary}
                        />
                      ) : (
                        <ChevronRight
                          size={20}
                          color={
                            isAvailable
                              ? colors.brand.primary
                              : colors.neutral.gray400
                          }
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.providerSecurityNote}>
                <ShieldCheck
                  size={17}
                  color="#166534"
                />

                <Text style={styles.providerSecurityText}>
                  Iniciarás sesión directamente con el proveedor.
                  BeeApp nunca recibe tu contraseña.
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          visible={Boolean(selectedConnection)}
          animationType="slide"
          onRequestClose={() => setSelectedConnection(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.detailsSheet}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>
                    Cuenta vinculada
                  </Text>

                  <Text style={styles.sheetSubtitle}>
                    Gestiona la autorización de esta cuenta.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedConnection(null)}
                  activeOpacity={0.7}
                >
                  <X
                    size={20}
                    color={colors.neutral.gray600}
                  />
                </TouchableOpacity>
              </View>

              {selectedConnection ? (
                <>
                  <View style={styles.accountDetailCard}>
                    <View
                      style={[
                        styles.detailProviderAvatar,
                        {
                          backgroundColor: (
                            selectedConnection.providerIconColor
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.providerAvatarText}>
                        {selectedConnection.providerIconLetter}
                      </Text>
                    </View>

                    <View style={styles.accountDetailText}>
                      <Text
                        style={styles.accountDetailName}
                        numberOfLines={1}
                      >
                        {selectedConnection.accountLabel}
                      </Text>

                      <Text style={styles.accountDetailProvider}>
                        {selectedConnection.providerName}
                      </Text>

                      <View style={styles.detailStatusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            {
                              backgroundColor: (
                                selectedConnection.statusColor
                              ),
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.detailStatusText,
                            {
                              color: selectedConnection.statusColor,
                            },
                          ]}
                        >
                          {selectedConnection.statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailInfoBox}>
                    <Text style={styles.detailInfoTitle}>
                      Estado de la autorización
                    </Text>

                    <Text style={styles.detailInfoText}>
                      {selectedConnection.helperText}
                    </Text>
                  </View>

                  {selectedConnectionCanReconnect ? (
                    <TouchableOpacity
                      style={styles.reconnectButton}
                      onPress={() => {
                        void handleReauthorize(selectedConnection);
                      }}
                      disabled={actionId === selectedConnection.id}
                      activeOpacity={0.8}
                    >
                      {actionId === selectedConnection.id ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.neutral.white}
                        />
                      ) : (
                        <RefreshCw
                          size={17}
                          color={colors.neutral.white}
                        />
                      )}

                      <Text style={styles.reconnectButtonText}>
                        Reconectar cuenta
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {selectedConnectionIsConnected ? (
                    <TouchableOpacity
                      style={styles.unlinkButton}
                      onPress={() => handleDisconnect(
                        selectedConnection,
                      )}
                      disabled={actionId === selectedConnection.id}
                      activeOpacity={0.8}
                    >
                      <Unlink
                        size={17}
                        color={colors.semantic.error}
                      />

                      <Text style={styles.unlinkButtonText}>
                        Desconectar cuenta
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {selectedConnectionCanDelete ? (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteRecord(
                        selectedConnection,
                      )}
                      disabled={actionId === selectedConnection.id}
                      activeOpacity={0.8}
                    >
                      <Trash2
                        size={17}
                        color={colors.semantic.error}
                      />

                      <Text style={styles.deleteButtonText}>
                        Eliminar de la lista
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              ) : null}
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    color: colors.neutral.gray600,
    marginBottom: 18,
  },
  linkAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    backgroundColor: colors.brand.primary,
    borderRadius: 19,
    paddingHorizontal: 16,
    marginBottom: 22,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  linkAccountIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  linkAccountTextColumn: {
    flex: 1,
  },
  linkAccountTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.white,
    marginBottom: 3,
  },
  linkAccountDescription: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.84)',
  },
  errorBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 13,
    marginBottom: 18,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#B45309',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.neutral.gray600,
  },
  sectionCount: {
    minWidth: 23,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 11,
    fontWeight: '800',
    color: colors.brand.primary,
    backgroundColor: '#F3E8FF',
  },
  connectionList: {
    gap: 10,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 13,
  },
  providerAvatar: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerAvatarText: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  connectionInfo: {
    flex: 1,
    minWidth: 0,
  },
  connectionAccount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  connectionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  connectionProvider: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionStatus: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  connectionHelper: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.neutral.gray500,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.neutral.gray300,
    borderRadius: 19,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 5,
  },
  emptyDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.neutral.gray600,
  },
  securityBox: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 3,
  },
  securityText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
  bottomSpacing: {
    height: 110,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  providerSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 30,
  },
  detailsSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 5,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.gray600,
    lineHeight: 17,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
  },
  providerOptions: {
    gap: 11,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 13,
  },
  providerOptionDisabled: {
    backgroundColor: colors.neutral.gray50,
  },
  providerOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerOptionIconText: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  providerOptionText: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  providerOptionName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  comingSoonTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.neutral.gray600,
    backgroundColor: colors.neutral.gray200,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    overflow: 'hidden',
  },
  providerOptionDescription: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
  providerSecurityNote: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 13,
    padding: 12,
    marginTop: 16,
  },
  providerSecurityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    color: '#166534',
  },
  accountDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
    marginBottom: 14,
  },
  detailProviderAvatar: {
    width: 51,
    height: 51,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  accountDetailText: {
    flex: 1,
    minWidth: 0,
  },
  accountDetailName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 3,
  },
  accountDetailProvider: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginBottom: 5,
  },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailInfoBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },
  detailInfoTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#92400E',
    marginBottom: 5,
  },
  detailInfoText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    color: '#B45309',
  },
  reconnectButton: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    borderRadius: 13,
    marginBottom: 10,
  },
  reconnectButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  unlinkButton: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
  },
  unlinkButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.semantic.error,
  },
  deleteButton: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 13,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.semantic.error,
  },
});