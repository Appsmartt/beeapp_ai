import { useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { useModuleNav, useScreenParams } from '../embedded/EmbeddedNavContext';
import OverviewSection, { OverviewEntry } from './OverviewSection';
import { getOverviewRows } from './overviewDataMappers';
import { getModule } from './homeModules';
import PinLockModal from '../security/PinLockModal';
import { isProtected } from '../../stores/pinStore';



export default function AllModulesOverview() {
  const router = useModuleNav();
  const params = useScreenParams();
  const moduleIds = (params.moduleIds as string[] | undefined) ?? [];
  const onOpenModule = params.onOpenModule as ((id: string) => void) | undefined;

  const [lockedTarget, setLockedTarget] = useState<{ pathname: string; params?: Record<string, string> } | null>(null);
  const [lockedItemName, setLockedItemName] = useState('');

  const openRow = (target: { pathname: string; params?: Record<string, string> }) => {
    router.push(target.params ? { pathname: target.pathname, params: target.params } : target.pathname);
  };

  const sections = moduleIds
    .map((id) => getModule(id))
    .filter((mod): mod is NonNullable<typeof mod> => !!mod && !mod.isOverview);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {sections.length === 0 && (
        <Text style={styles.empty}>
          No tienes módulos activos. Usa el engranaje de los chips para elegir cuáles ver aquí.
        </Text>
      )}

      {sections.map((mod) => {
        const rows = getOverviewRows(mod.id);
        return (
          <OverviewSection
            key={mod.id}
            title={mod.name}
            icon={mod.icon}
            color={mod.iconColor}
            items={rows.map((row) => row.entry)}
            onItemPress={(entry: OverviewEntry) => {
              const row = rows.find((r) => r.entry.key === entry.key);
              if (row) {
                if (isProtected(entry.key)) {
                  setLockedItemName(entry.title);
                  setLockedTarget(row.target);
                  return;
                }
                openRow(row.target);
              }
            }}
            onVerMasPress={() => onOpenModule?.(mod.id)}
          />
        );
      })}



      <PinLockModal
        visible={!!lockedTarget}
        itemName={lockedItemName}
        onClose={() => {
          setLockedTarget(null);
          setLockedItemName('');
        }}
        onSuccess={() => {
          const target = lockedTarget;
          setLockedTarget(null);
          setLockedItemName('');
          if (target) openRow(target);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  empty: { fontSize: 12.5, fontWeight: '500', color: colors.neutral.gray600, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
});
