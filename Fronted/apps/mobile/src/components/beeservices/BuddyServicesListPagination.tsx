import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

import {
  BUDDY_SERVICES_LIST_PAGE_SIZE,
} from '../../features/buddyservices/buddyServicesListPagination';

interface BuddyServicesListPaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function getBuddyServicesTotalPages(
  totalCount: number,
  pageSize: number = BUDDY_SERVICES_LIST_PAGE_SIZE,
): number {
  if (totalCount <= 0) {
    return 1;
  }

  return Math.ceil(totalCount / pageSize);
}

export default function BuddyServicesListPagination({
  currentPage,
  totalCount,
  pageSize = BUDDY_SERVICES_LIST_PAGE_SIZE,
  onPageChange,
  loading = false,
}: BuddyServicesListPaginationProps) {
  const totalPages = getBuddyServicesTotalPages(
    totalCount,
    pageSize,
  );

  if (totalCount <= pageSize) {
    return null;
  }

  const canGoPrevious = currentPage > 1 && !loading;
  const canGoNext = currentPage < totalPages && !loading;

  return (
    <View
      accessibilityLabel={`Paginación, página ${currentPage} de ${totalPages}`}
      style={styles.container}
    >
      <TouchableOpacity
        accessibilityLabel="Página anterior"
        accessibilityRole="button"
        accessibilityState={{
          disabled: !canGoPrevious,
        }}
        activeOpacity={0.75}
        disabled={!canGoPrevious}
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={() => {
          onPageChange(currentPage - 1);
        }}
        style={[
          styles.navChip,
          !canGoPrevious && styles.navChipDisabled,
        ]}
      >
        <ChevronLeft
          color={canGoPrevious ? '#7567D9' : '#C4B8D9'}
          size={20}
          strokeWidth={2.5}
        />
      </TouchableOpacity>

      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator
            color="#7567D9"
            size="small"
          />
        ) : (
          <>
            <Text style={styles.pageIndicator}>
              <Text style={styles.pageCurrent}>
                {currentPage}
              </Text>
              <Text style={styles.pageSeparator}>
                {' / '}
              </Text>
              <Text style={styles.pageTotal}>
                {totalPages}
              </Text>
            </Text>

            {totalPages <= 7 ? (
              <View style={styles.dotsRow}>
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  const isActive = page === currentPage;

                  return (
                    <View
                      key={page}
                      style={[
                        styles.dot,
                        isActive && styles.dotActive,
                      ]}
                    />
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </View>

      <TouchableOpacity
        accessibilityLabel="Página siguiente"
        accessibilityRole="button"
        accessibilityState={{
          disabled: !canGoNext,
        }}
        activeOpacity={0.75}
        disabled={!canGoNext}
        hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
        onPress={() => {
          onPageChange(currentPage + 1);
        }}
        style={[
          styles.navChip,
          !canGoNext && styles.navChipDisabled,
        ]}
      >
        <ChevronRight
          color={canGoNext ? '#7567D9' : '#C4B8D9'}
          size={20}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  navChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E2F4',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  navChipDisabled: {
    backgroundColor: '#FAFAFC',
    borderColor: '#EFECF5',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 72,
  },
  pageIndicator: {
    textAlign: 'center',
  },
  pageCurrent: {
    color: '#38294E',
    fontSize: 15,
    fontWeight: '800',
  },
  pageSeparator: {
    color: '#B8A8CC',
    fontSize: 14,
    fontWeight: '500',
  },
  pageTotal: {
    color: '#7B6A94',
    fontSize: 15,
    fontWeight: '600',
  },
  dotsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  dot: {
    backgroundColor: '#DDD5EE',
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  dotActive: {
    backgroundColor: '#7567D9',
    width: 14,
  },
});
