import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@beeapp/design-system';
import MainQuickActions from '../../src/components/MainQuickActions';
import HomeHeader from '../../src/components/home/HomeHeader';
import {
  HomeSearchProvider,
  useHomeSearch,
} from '../../src/components/home/HomeSearchContext';
import HomeSideMenu from '../../src/components/home/HomeSideMenu';
import EmbeddedModuleHost from '../../src/components/embedded/EmbeddedModuleHost';
import {
  CUSTOMIZABLE_MODULES,
  OVERVIEW_MODULE_ID,
} from '../../src/components/home/homeModules';
import {
  SEARCH_FILTER_TO_MODULE,
} from '../../src/components/home/searchFilters';

const DEFAULT_MODULE_IDS = CUSTOMIZABLE_MODULES.map((module) => module.id);

export default function HomeScreen() {
  return (
    <HomeSearchProvider>
      <HomeScreenBody />
    </HomeSearchProvider>
  );
}

function HomeScreenBody() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    filter,
    clearSearch,
  } = useHomeSearch();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const selectedModuleIds = DEFAULT_MODULE_IDS;
  const [activeModuleId, setActiveModuleId] = useState<string>(
    'chat',
  );
  const [moduleTarget, setModuleTarget] = useState<{
    path: string;
    params?: Record<string, string>;
  } | null>(null);
  const [openSeq, setOpenSeq] = useState(0);

  const [isDetailView, setIsDetailView] = useState(false);

  useEffect(() => {
    if (!filter) {
      return;
    }

    const moduleId = SEARCH_FILTER_TO_MODULE[filter];

    setActiveModuleId((current) => (
      current === moduleId ? current : moduleId
    ));
    setModuleTarget(null);
    setIsDetailView(false);
  }, [filter]);

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

    if (
      filter
      && SEARCH_FILTER_TO_MODULE[filter] !== id
    ) {
      clearSearch();
    }

    setActiveModuleId(id);
    setModuleTarget(target ?? null);
    setOpenSeq((sequence) => sequence + 1);
    setIsDetailView(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {!isDetailView && (
        <>
          <View style={styles.topSection}>
            <HomeHeader onMenuPress={() => setSideMenuVisible(true)} />
          </View>

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

      {!isDetailView && !sideMenuVisible ? (
        <MainQuickActions />
      ) : null}

      <HomeSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FF',
  },
  topSection: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
  },
});