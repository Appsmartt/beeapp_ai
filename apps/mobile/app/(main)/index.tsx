import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@beeapp/design-system';
import VoiceAssistantFab from '../../src/components/VoiceAssistantFab';
import HomeHeader from '../../src/components/home/HomeHeader';
import HomeSideMenu from '../../src/components/home/HomeSideMenu';
import ModuleSwitcherRow from '../../src/components/home/ModuleSwitcherRow';
import HomeCustomizeModal from '../../src/components/home/HomeCustomizeModal';
import EmbeddedModuleHost from '../../src/components/embedded/EmbeddedModuleHost';
import {
  CUSTOMIZABLE_MODULES,
  OVERVIEW_MODULE_ID,
} from '../../src/components/home/homeModules';

const DEFAULT_MODULE_IDS = CUSTOMIZABLE_MODULES.map((module) => module.id);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(
    DEFAULT_MODULE_IDS,
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempSelectedModuleIds, setTempSelectedModuleIds] = useState<string[]>(
    DEFAULT_MODULE_IDS,
  );

  const [activeModuleId, setActiveModuleId] = useState<string>(
    OVERVIEW_MODULE_ID,
  );
  const [moduleTarget, setModuleTarget] = useState<{
    path: string;
    params?: Record<string, string>;
  } | null>(null);
  const [openSeq, setOpenSeq] = useState(0);

  const [isDetailView, setIsDetailView] = useState(false);

  const openModule = (
    id: string,
    target?: {
      path: string;
      params?: Record<string, string>;
    },
  ) => {
    if (id === 'beeservices') {
      router.push('/(main)/beeservices');
      return;
    }

    setActiveModuleId(id);
    setModuleTarget(target ?? null);
    setOpenSeq((sequence) => sequence + 1);
    setIsDetailView(false);
  };

  const openCustomize = () => {
    setTempSelectedModuleIds([...selectedModuleIds]);
    setIsCustomizing(true);
  };

  const saveCustomize = () => {
    setSelectedModuleIds(tempSelectedModuleIds);
    setIsCustomizing(false);

    if (activeModuleId === OVERVIEW_MODULE_ID) {
      setOpenSeq((sequence) => sequence + 1);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {!isDetailView && (
        <>
          <View style={styles.topSection}>
            <HomeHeader onMenuPress={() => setSideMenuVisible(true)} />
          </View>

          <ModuleSwitcherRow
            selectedModuleIds={selectedModuleIds}
            activeModuleId={activeModuleId}
            hideOverview={activeModuleId === OVERVIEW_MODULE_ID}
            onSelect={openModule}
            onCustomize={openCustomize}
          />
        </>
      )}

      <EmbeddedModuleHost
        key={`${activeModuleId}-${openSeq}`}
        moduleId={activeModuleId}
        initialPath={moduleTarget?.path}
        initialParams={moduleTarget?.params}
        rootParams={
          activeModuleId === OVERVIEW_MODULE_ID
            ? {
                moduleIds: selectedModuleIds,
                onOpenModule: openModule,
              }
            : undefined
        }
        onStackDepthChange={(depth) => setIsDetailView(depth > 0)}
      />

      <VoiceAssistantFab />

      <HomeSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
      />

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