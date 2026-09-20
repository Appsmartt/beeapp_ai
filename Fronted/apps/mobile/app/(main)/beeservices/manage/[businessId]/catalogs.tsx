import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Archive,
  Edit3,
  FolderPlus,
  Layers3,
  Plus,
  PauseCircle,
  PlayCircle,
  Save,
  X,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useModuleNav,
  useScreenParams,
} from '../../../../../src/components/embedded/EmbeddedNavContext';

import type {
  CommercialCatalog,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesManageOffersRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
  archiveOwnedCatalog,
  createOwnedCatalog,
  loadOwnedCommercialCatalogs,
  pauseOwnedCatalog,
  publishOwnedCatalog,
  restoreOwnedCatalog,
  updateOwnedCatalog,
} from '../../../../../src/services/commercialService';

type CatalogEditorState = {
  catalog: CommercialCatalog | null;
  name: string;
  description: string;
} | null;

type CatalogAction =
  | 'pause'
  | 'publish'
  | 'archive'
  | 'restore';

type CatalogActionConfirmation = {
  catalog: CommercialCatalog;
  action: CatalogAction;
} | null;

function catalogActionCopy(
  action: CatalogAction,
): {
  title: string;
  description: string;
  confirmLabel: string;
  color: string;
} {
  if (action === 'pause') {
    return {
      title: 'Pausar catálogo',
      description: (
        'El catálogo dejará de estar disponible '
        + 'para clientes hasta que lo publiques nuevamente.'
      ),
      confirmLabel: 'Pausar catálogo',
      color: '#9A5B00',
    };
  }

  if (action === 'publish') {
    return {
      title: 'Publicar catálogo',
      description: (
        'El catálogo quedará visible según las reglas '
        + 'de publicación definidas por el backend.'
      ),
      confirmLabel: 'Publicar catálogo',
      color: '#177245',
    };
  }

  if (action === 'archive') {
    return {
      title: 'Archivar catálogo',
      description: (
        'El catálogo dejará de mostrarse públicamente. '
        + 'Su historial se conservará y podrás restaurarlo.'
      ),
      confirmLabel: 'Archivar catálogo',
      color: '#B42318',
    };
  }

  return {
    title: 'Restaurar catálogo',
    description: (
      'El catálogo volverá a estar disponible para '
      + 'configuración. Debes publicarlo para mostrarlo.'
    ),
    confirmLabel: 'Restaurar catálogo',
    color: '#177245',
  };
}

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function createNewCatalogEditor(): CatalogEditorState {
  return {
    catalog: null,
    name: '',
    description: '',
  };
}

function createExistingCatalogEditor(
  catalog: CommercialCatalog,
): CatalogEditorState {
  return {
    catalog,
    name: catalog.name,
    description: catalog.description || '',
  };
}

function normalizeOptionalText(
  value: string,
): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function catalogStatusCopy(
  catalog: CommercialCatalog,
): {
  label: string;
  color: string;
} {
  if (catalog.status === 'paused') {
    return {
      label: 'Pausado',
      color: '#9A5B00',
    };
  }

  if (catalog.status === 'archived') {
    return {
      label: 'Archivado',
      color: '#6D6875',
    };
  }

  return {
    label: 'Publicado',
    color: '#177245',
  };
}

export default function BuddyServicesManageCatalogsScreen() {
  const router = useModuleNav();
  const params = useScreenParams() as {
    businessId?: string | string[];
  };

  const businessId = normalizeBusinessId(params.businessId);

  const [catalogs, setCatalogs] = useState<
    CommercialCatalog[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [editor, setEditor] = useState<CatalogEditorState>(
    null,
  );
  const [
    actionConfirmation,
    setActionConfirmation,
  ] = useState<CatalogActionConfirmation>(null);
  const [editorError, setEditorError] = useState<
    string | null
  >(null);
  const publishedCatalogCount = catalogs.filter(
    (catalog) => catalog.status === 'published',
  ).length;

  const loadCatalogs = useCallback(async () => {
    if (!businessId) {
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialCatalogs(
        businessId,
        {
          include_archived: false,
        },
      );

      setCatalogs(response.catalogs);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setCatalogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  const closeEditor = useCallback(() => {
    if (isSaving) {
      return;
    }

    setEditor(null);
    setEditorError(null);
  }, [isSaving]);

  const saveCatalog = useCallback(async () => {
    if (!editor || !businessId) {
      return;
    }

    const normalizedName = editor.name.trim();

    if (!normalizedName) {
      setEditorError('Escribe el nombre del catálogo.');
      return;
    }

    const nextSortOrder = catalogs.reduce(
      (highestSortOrder, catalog) => (
        Math.max(highestSortOrder, catalog.sort_order)
      ),
      -1,
    ) + 1;

    setIsSaving(true);
    setEditorError(null);

    try {
      if (editor.catalog) {
        await updateOwnedCatalog(
          businessId,
          editor.catalog.id,
          {
            name: normalizedName,
            description: normalizeOptionalText(
              editor.description,
            ),
            sort_order: editor.catalog.sort_order,
          },
        );
      } else {
        await createOwnedCatalog(
          businessId,
          {
            name: normalizedName,
            description: normalizeOptionalText(
              editor.description,
            ),
            sort_order: nextSortOrder,
            status: 'published',
          },
        );
      }

      closeEditor();
      await loadCatalogs();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setEditorError(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    closeEditor,
    editor,
    loadCatalogs,
  ]);

  const runCatalogAction = useCallback(async () => {
    if (!actionConfirmation || !businessId) {
      return;
    }

    const {
      action,
      catalog,
    } = actionConfirmation;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (action === 'pause') {
        await pauseOwnedCatalog(
          businessId,
          catalog.id,
        );
      } else if (action === 'publish') {
        await publishOwnedCatalog(
          businessId,
          catalog.id,
        );
      } else if (action === 'archive') {
        await archiveOwnedCatalog(
          businessId,
          catalog.id,
        );
      } else {
        await restoreOwnedCatalog(
          businessId,
          catalog.id,
        );
      }

      setActionConfirmation(null);
      await loadCatalogs();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setActionConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    actionConfirmation,
    businessId,
    loadCatalogs,
  ]);

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: '#FFFCF9',
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Volver a gestión del negocio"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isSaving ? 0.55 : 1,
            width: 42,
          }}
        >
          <ArrowLeft
            color="#3D245E"
            size={21}
          />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            marginLeft: 12,
          }}
        >
          <Text
            style={{
              color: '#88709E',
              fontSize: 11,
              fontWeight: '900',
              letterSpacing: 0.7,
            }}
          >
            ORGANIZACIÓN COMERCIAL
          </Text>

          <Text
            style={{
              color: '#261743',
              fontSize: 24,
              fontWeight: '900',
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            Catálogos
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Crear catálogo"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={isLoading || isSaving}
          onPress={() => {
            setEditorError(null);
            setEditor(createNewCatalogEditor());
          }}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isLoading || isSaving ? 0.55 : 1,
            width: 42,
          }}
        >
          <Plus
            color="#FFFFFF"
            size={21}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator
            color="#7427D5"
            size="large"
          />

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              marginTop: 14,
            }}
          >
            Cargando catálogos…
          </Text>
        </View>
      ) : errorMessage ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            No fue posible cargar los catálogos
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 9,
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Reintentar cargar catálogos"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadCatalogs();
            }}
            style={{
              backgroundColor: '#7427D5',
              borderRadius: 13,
              marginTop: 22,
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 118,
            paddingHorizontal: 20,
            paddingTop: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#261743',
              borderRadius: 20,
              flexDirection: 'row',
              padding: 18,
            }}
          >
            <View
              style={{
                flex: 1,
                paddingRight: 14,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 17,
                  fontWeight: '900',
                }}
              >
                Organiza tu vitrina
              </Text>

              <Text
                style={{
                  color: '#DCC8FF',
                  fontSize: 13,
                  lineHeight: 19,
                  marginTop: 5,
                }}
              >
                Agrupa ofertas para mantener productos y servicios claros.
              </Text>
            </View>

            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#3C2860',
                borderColor: '#5A3D87',
                borderRadius: 16,
                borderWidth: 1,
                minWidth: 76,
                paddingHorizontal: 10,
                paddingVertical: 11,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 22,
                  fontWeight: '900',
                }}
              >
                {catalogs.length}
              </Text>

              <Text
                style={{
                  color: '#DCC8FF',
                  fontSize: 10,
                  fontWeight: '800',
                  marginTop: 2,
                }}
              >
                {catalogs.length === 1 ? 'catálogo' : 'catálogos'}
              </Text>
            </View>
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 14,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#EAF7EE',
                borderColor: '#CDEBD7',
                borderRadius: 999,
                borderWidth: 1,
                flexDirection: 'row',
                minHeight: 34,
                paddingHorizontal: 11,
              }}
            >
              <View
                style={{
                  backgroundColor: '#177245',
                  borderRadius: 4,
                  height: 8,
                  marginRight: 7,
                  width: 8,
                }}
              />

              <Text
                style={{
                  color: '#177245',
                  fontSize: 12,
                  fontWeight: '800',
                }}
              >
                {publishedCatalogCount === 1
                  ? '1 publicado'
                  : `${publishedCatalogCount} publicados`}
              </Text>
            </View>

            <Layers3 color="#7427D5" size={20} />
          </View>

          <TouchableOpacity
            accessibilityLabel="Ver catálogos archivados"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isSaving}
            onPress={() => {
              router.push({
                pathname: (
                  '/(main)/beeservices/manage/[businessId]/'
                  + 'catalogs/archived'
                ),
                params: {
                  businessId,
                },
              });
            }}
            style={{
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: '#F4EDF9',
              borderRadius: 12,
              flexDirection: 'row',
              marginTop: 14,
              minHeight: 38,
              opacity: isSaving ? 0.55 : 1,
              paddingHorizontal: 13,
            }}
          >
            <Archive
              color="#7427D5"
              size={17}
            />

            <Text
              style={{
                color: '#7427D5',
                fontSize: 13,
                fontWeight: '800',
                marginLeft: 7,
              }}
            >
              Ver archivados
            </Text>
          </TouchableOpacity>

          {catalogs.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 28,
                paddingTop: 70,
              }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F6EAFE',
                  borderRadius: 30,
                  height: 60,
                  justifyContent: 'center',
                  width: 60,
                }}
              >
                <FolderPlus
                  color="#7427D5"
                  size={28}
                />
              </View>

              <Text
                style={{
                  color: '#261743',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 17,
                  textAlign: 'center',
                }}
              >
                Aún no tienes catálogos
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 14,
                  lineHeight: 21,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Crea tu primer catálogo para organizar tus
                productos o servicios.
              </Text>

              <TouchableOpacity
                accessibilityLabel="Crear primer catálogo"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => {
                  setEditorError(null);
                  setEditor(createNewCatalogEditor());
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#7427D5',
                  borderRadius: 14,
                  flexDirection: 'row',
                  marginTop: 22,
                  minHeight: 46,
                  paddingHorizontal: 16,
                }}
              >
                <Plus
                  color="#FFFFFF"
                  size={18}
                />

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '800',
                    marginLeft: 8,
                  }}
                >
                  Crear catálogo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                marginTop: 18,
              }}
            >
              {catalogs.map((catalog) => {
                const statusCopy = catalogStatusCopy(catalog);

                return (
                  <View
                    key={catalog.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7DDF2',
                      borderRadius: 18,
                      borderWidth: 1,
                      marginBottom: 12,
                      padding: 16,
                      shadowColor: '#38294E',
                      shadowOffset: {
                        width: 0,
                        height: 3,
                      },
                      shadowOpacity: 0.05,
                      shadowRadius: 10,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        alignItems: 'flex-start',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                      }}
                    >
                      <TouchableOpacity
                        accessibilityHint="Abre los productos y servicios de este catálogo"
                        accessibilityLabel={`Abrir ${catalog.name}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          router.push(
                            buddyServicesManageOffersRoute(
                              businessId,
                              catalog.id,
                            ),
                          );
                        }}
                        style={{
                          flex: 1,
                          opacity: isSaving ? 0.55 : 1,
                          paddingRight: 12,
                        }}
                      >
                        <Text
                          numberOfLines={2}
                          style={{
                            color: '#261743',
                            fontSize: 16,
                            fontWeight: '800',
                          }}
                        >
                          {catalog.name}
                        </Text>

                        {catalog.description ? (
                          <Text
                            numberOfLines={3}
                            style={{
                              color: '#786593',
                              fontSize: 13,
                              lineHeight: 19,
                              marginTop: 5,
                            }}
                          >
                            {catalog.description}
                          </Text>
                        ) : null}
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityLabel={`Editar ${catalog.name}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setEditorError(null);
                          setEditor(
                            createExistingCatalogEditor(catalog),
                          );
                        }}
                        style={{
                          alignItems: 'center',
                          backgroundColor: '#F6EAFE',
                          borderRadius: 12,
                          height: 38,
                          justifyContent: 'center',
                          opacity: isSaving ? 0.55 : 1,
                          width: 38,
                        }}
                      >
                        <Edit3
                          color="#7427D5"
                          size={18}
                        />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 13,
                      }}
                    >
                      <Text
                        style={{
                          color: statusCopy.color,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {statusCopy.label}
                      </Text>

                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 13,
                      }}
                    >
                      {catalog.status === 'published' ? (
                        <TouchableOpacity
                          accessibilityLabel={`Pausar ${catalog.name}`}
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          disabled={isSaving}
                          onPress={() => {
                            setActionConfirmation({
                              catalog,
                              action: 'pause',
                            });
                          }}
                          style={{
                            alignItems: 'center',
                            backgroundColor: '#FFF4DE',
                            borderRadius: 11,
                            flexDirection: 'row',
                            opacity: isSaving ? 0.55 : 1,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          }}
                        >
                          <PauseCircle
                            color="#9A5B00"
                            size={15}
                          />

                          <Text
                            style={{
                              color: '#9A5B00',
                              fontSize: 12,
                              fontWeight: '800',
                              marginLeft: 6,
                            }}
                          >
                            Pausar
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {catalog.status === 'paused' ? (
                        <TouchableOpacity
                          accessibilityLabel={`Publicar ${catalog.name}`}
                          accessibilityRole="button"
                          activeOpacity={0.82}
                          disabled={isSaving}
                          onPress={() => {
                            setActionConfirmation({
                              catalog,
                              action: 'publish',
                            });
                          }}
                          style={{
                            alignItems: 'center',
                            backgroundColor: '#E8F7EE',
                            borderRadius: 11,
                            flexDirection: 'row',
                            opacity: isSaving ? 0.55 : 1,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                          }}
                        >
                          <PlayCircle
                            color="#177245"
                            size={15}
                          />

                          <Text
                            style={{
                              color: '#177245',
                              fontSize: 12,
                              fontWeight: '800',
                              marginLeft: 6,
                            }}
                          >
                            Publicar
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        accessibilityLabel={`Archivar ${catalog.name}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setActionConfirmation({
                            catalog,
                            action: 'archive',
                          });
                        }}
                        style={{
                          alignItems: 'center',
                          backgroundColor: '#FFF0F0',
                          borderRadius: 11,
                          flexDirection: 'row',
                          opacity: isSaving ? 0.55 : 1,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                        }}
                      >
                        <Archive
                          color="#B42318"
                          size={15}
                        />

                        <Text
                          style={{
                            color: '#B42318',
                            fontSize: 12,
                            fontWeight: '800',
                            marginLeft: 6,
                          }}
                        >
                          Archivar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            setActionConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(actionConfirmation)}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(38, 23, 67, 0.42)',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFCF9',
              borderRadius: 20,
              padding: 20,
              width: '100%',
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 19,
                fontWeight: '900',
              }}
            >
              {actionConfirmation
                ? catalogActionCopy(
                  actionConfirmation.action,
                ).title
                : ''}
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              {actionConfirmation
                ? catalogActionCopy(
                  actionConfirmation.action,
                ).description
                : ''}
            </Text>

            <Text
              style={{
                color: '#4E3B68',
                fontSize: 13,
                fontWeight: '700',
                marginTop: 13,
              }}
            >
              {actionConfirmation?.catalog.name || ''}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 22,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Cancelar acción de catálogo"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  setActionConfirmation(null);
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#3D245E',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Confirmar acción de catálogo"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void runCatalogAction();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: actionConfirmation
                    ? catalogActionCopy(
                      actionConfirmation.action,
                    ).color
                    : '#7427D5',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {isSaving
                    ? 'Procesando…'
                    : actionConfirmation
                      ? catalogActionCopy(
                        actionConfirmation.action,
                      ).confirmLabel
                      : 'Confirmar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        transparent
        visible={Boolean(editor)}
      >
        <View
          style={{
            backgroundColor: 'rgba(38, 23, 67, 0.38)',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFCF9',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '88%',
              paddingBottom: 28,
              paddingHorizontal: 18,
              paddingTop: 18,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 19,
                  fontWeight: '900',
                }}
              >
                {editor?.catalog
                  ? 'Editar catálogo'
                  : 'Crear catálogo'}
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar formulario de catálogo"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={closeEditor}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 13,
                  height: 38,
                  justifyContent: 'center',
                  opacity: isSaving ? 0.55 : 1,
                  width: 38,
                }}
              >
                <X
                  color="#3D245E"
                  size={19}
                />
              </TouchableOpacity>
            </View>

            {editorError ? (
              <View
                accessibilityLiveRegion="polite"
              accessibilityRole="alert"
                style={{
                  backgroundColor: '#FFF0F0',
                  borderColor: '#F7B2B2',
                  borderRadius: 13,
                  borderWidth: 1,
                  marginTop: 16,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: '#B42318',
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {editorError}
                </Text>
              </View>
            ) : null}

            <TextInput
              accessibilityLabel="Nombre del catálogo"
              editable={!isSaving}
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      name: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Nombre del catálogo"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                marginTop: 18,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={editor?.name || ''}
            />

            <TextInput
              accessibilityLabel="Descripción del catálogo"
              editable={!isSaving}
              multiline
              numberOfLines={4}
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      description: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Descripción opcional"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                lineHeight: 20,
                marginTop: 10,
                minHeight: 92,
                paddingHorizontal: 13,
                paddingTop: 12,
                textAlignVertical: 'top',
              }}
              value={editor?.description || ''}
            />

            <TouchableOpacity
              accessibilityLabel="Guardar catálogo"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSaving,
disabled: isSaving,
}}
activeOpacity={0.82}
disabled={isSaving}
onPress={() => {
void saveCatalog();
}}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 15,
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 20,
                minHeight: 50,
                opacity: isSaving ? 0.65 : 1,
                paddingHorizontal: 18,
              }}
            >
              <Save
                color="#FFFFFF"
                size={19}
              />

              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '800',
                  marginLeft: 8,
                }}
              >
                {isSaving
                  ? 'Guardando…'
                  : 'Guardar catálogo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
