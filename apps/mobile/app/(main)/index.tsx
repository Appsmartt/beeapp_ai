import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@beeapp/design-system';
import VoiceAssistantFab from '../../src/components/VoiceAssistantFab';
import HomeHeader from '../../src/components/home/HomeHeader';
import HomeSideMenu from '../../src/components/home/HomeSideMenu';
import ModuleSwitcherRow from '../../src/components/home/ModuleSwitcherRow';
import HomeCustomizeModal from '../../src/components/home/HomeCustomizeModal';
import EmbeddedModuleHost from '../../src/components/embedded/EmbeddedModuleHost';
import { CUSTOMIZABLE_MODULES, OVERVIEW_MODULE_ID } from '../../src/components/home/homeModules';

const DEFAULT_MODULE_IDS = CUSTOMIZABLE_MODULES.map((m) => m.id);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(DEFAULT_MODULE_IDS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempSelectedModuleIds, setTempSelectedModuleIds] = useState<string[]>(DEFAULT_MODULE_IDS);

  const [activeModuleId, setActiveModuleId] = useState<string>(OVERVIEW_MODULE_ID);
  const [moduleTarget, setModuleTarget] = useState<{ path: string; params?: Record<string, string> } | null>(null);
  const [openSeq, setOpenSeq] = useState(0);

  // Detail depth tracking: hides HomeHeader and ModuleSwitcherRow when depth > 0
  const [isDetailView, setIsDetailView] = useState(false);

  const openModule = (id: string, target?: { path: string; params?: Record<string, string> }) => {
    setActiveModuleId(id);
    setModuleTarget(target ?? null);
    setOpenSeq((s) => s + 1);
    setIsDetailView(false);
  };

  const openCustomize = () => {
    setTempSelectedModuleIds([...selectedModuleIds]);
    setIsCustomizing(true);
  };

  const saveCustomize = () => {
    setSelectedModuleIds(tempSelectedModuleIds);
    setIsCustomizing(false);
    if (activeModuleId === OVERVIEW_MODULE_ID) setOpenSeq((s) => s + 1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header & Horizontal Module Chips (hidden when viewing detail) */}
      {!isDetailView && (
        <>
          <View style={styles.topSection}>
            <HomeHeader onMenuPress={() => setSideMenuVisible(true)} />
          </View>
          <ModuleSwitcherRow
            selectedModuleIds={selectedModuleIds}
            activeModuleId={activeModuleId}
            onSelect={(id) => openModule(id)}
            onCustomize={openCustomize}
          />
        </>
      )}

      {/* Embedded Module Host */}
      <EmbeddedModuleHost
        key={`${activeModuleId}-${openSeq}`}
        moduleId={activeModuleId}
        initialPath={moduleTarget?.path}
        initialParams={moduleTarget?.params}
        rootParams={
          activeModuleId === OVERVIEW_MODULE_ID
            ? { moduleIds: selectedModuleIds, onOpenModule: (id: string) => openModule(id) }
            : undefined
        }
        onStackDepthChange={(depth) => setIsDetailView(depth > 0)}
      />

      {/* Draggable Voice Assistant FAB */}
      <VoiceAssistantFab />

      {/* Side menu drawer */}
      <HomeSideMenu visible={sideMenuVisible} onClose={() => setSideMenuVisible(false)} />

      {/* Personalization Modal */}
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
});
