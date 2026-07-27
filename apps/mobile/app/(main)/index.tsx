import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@beeapp/design-system';
import { LayoutGrid } from 'lucide-react-native';
import FloatingTabBar from '../../src/components/FloatingTabBar';
import HomeHeader from '../../src/components/home/HomeHeader';
import HomeSideMenu from '../../src/components/home/HomeSideMenu';
import ModuleSwitcherRow from '../../src/components/home/ModuleSwitcherRow';
import HomeCustomizeModal from '../../src/components/home/HomeCustomizeModal';
import EmbeddedModuleHost from '../../src/components/embedded/EmbeddedModuleHost';
import { OVERVIEW_MODULE_ID } from '../../src/components/home/homeModules';
import { TickerTarget } from '../../src/mocks/tabNotifications';

const DEFAULT_MODULE_IDS = ['mail', 'notes', 'contacts'];

/**
 * All-in-one Home: top bar, module chips and the selected module rendered
 * embedded right below. Modules never navigate away. The voice assistant
 * lives only in the floating tab bar.
 */
export default function HomeScreen() {
  // Device inset: the Home is the screen that pushes everything below the status bar
  const insets = useSafeAreaInsets();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  // Which modules are shown as chips, and in which order
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(DEFAULT_MODULE_IDS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempSelectedModuleIds, setTempSelectedModuleIds] = useState<string[]>(DEFAULT_MODULE_IDS);

  // Module shown embedded below the chips ("Todas" overview is open by default)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(OVERVIEW_MODULE_ID);
  // Optional inner screen to open the module on (coming from a notification)
  const [moduleTarget, setModuleTarget] = useState<{ path: string; params?: Record<string, string> } | null>(null);
  // Bumped on every open so the host remounts with a fresh stack
  const [openSeq, setOpenSeq] = useState(0);

  const openModule = (id: string, target?: { path: string; params?: Record<string, string> }) => {
    setActiveModuleId(id);
    setModuleTarget(target ?? null);
    setOpenSeq((s) => s + 1);
  };

  const openNotificationTarget = (target: TickerTarget) => {
    openModule(target.module, { path: target.path, params: target.params });
  };

  const openCustomize = () => {
    setTempSelectedModuleIds([...selectedModuleIds]);
    setIsCustomizing(true);
  };

  const saveCustomize = () => {
    setSelectedModuleIds(tempSelectedModuleIds);
    setIsCustomizing(false);
    // The overview lists the chips: remount it so the sections match the new list
    if (activeModuleId === OVERVIEW_MODULE_ID) {
      setOpenSeq((s) => s + 1);
      return;
    }
    // Keep a valid module open: fall back to the first chip of the new list
    if (!activeModuleId || !tempSelectedModuleIds.includes(activeModuleId)) {
      if (tempSelectedModuleIds.length > 0) {
        openModule(tempSelectedModuleIds[0]);
      } else {
        setActiveModuleId(null);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar stays visible above the module */}
      <View style={styles.topSection}>
        <HomeHeader onMenuPress={() => setSideMenuVisible(true)} />
      </View>

      {/* Module chips (configurable list and order) */}
      <ModuleSwitcherRow
        selectedModuleIds={selectedModuleIds}
        activeModuleId={activeModuleId}
        onSelect={(id) => openModule(id)}
        onCustomize={openCustomize}
      />

      {/* Selected module, embedded right below the chips */}
      {activeModuleId ? (
        <EmbeddedModuleHost
          key={`${activeModuleId}-${openSeq}`}
          moduleId={activeModuleId}
          initialPath={moduleTarget?.path}
          initialParams={moduleTarget?.params}
          // The overview needs the chip list and a way to jump to a module
          rootParams={
            activeModuleId === OVERVIEW_MODULE_ID
              ? { moduleIds: selectedModuleIds, onOpenModule: (id: string) => openModule(id) }
              : undefined
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <LayoutGrid size={28} color={colors.brand.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sin módulos activos</Text>
          <Text style={styles.emptyDesc}>
            Elige qué módulos quieres tener siempre a mano en tu inicio.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openCustomize} activeOpacity={0.8}>
            <Text style={styles.emptyBtnText}>Personalizar módulos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gap so the module card clears the floating tab bar */}
      <View style={{ height: 96 }} />

      {/* Floating Pill Menu Tab Bar: always present */}
      <FloatingTabBar onOpenNotificationTarget={openNotificationTarget} />

      {/* Side menu drawer (holds the profile section) */}
      <HomeSideMenu visible={sideMenuVisible} onClose={() => setSideMenuVisible(false)} />

      {/* Personalization: which chips appear and in which order */}
      <HomeCustomizeModal
        visible={isCustomizing}
        selectedIds={tempSelectedModuleIds}
        onChangeSelected={setTempSelectedModuleIds}
        onCancel={() => setIsCustomizing(false)}
        onSave={saveCustomize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
