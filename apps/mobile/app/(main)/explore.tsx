import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  Search,
  Mail,
  MessageSquare,
  Users,
  FileText,
  Calendar,
  Folder,
  ChevronRight,
  Sparkles,
  Lock,
  Globe,
} from 'lucide-react-native';
import FloatingTabBar from '../../src/components/FloatingTabBar';

interface ModuleDef {
  id: string;
  name: string;
  description: string;
  category: 'Comunicación' | 'Productividad' | 'Próximamente';
  icon: any; // Lucide Component
  bgColor: string;
  iconColor: string;
  targetPath?: string;
  isUpcoming?: boolean;
}

const ALL_MODULES: ModuleDef[] = [
  // Comunicación
  {
    id: 'mail',
    name: 'Correos',
    description: 'Gestiona tus bandejas de Gmail y Outlook con redactado inteligente.',
    category: 'Comunicación',
    icon: Mail,
    bgColor: '#EBF5FF',
    iconColor: '#1E88E5',
    targetPath: '/(main)/mail',
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Mensajería empresarial instantánea coordinada por el asistente.',
    category: 'Comunicación',
    icon: MessageSquare,
    bgColor: '#F5E8FF',
    iconColor: '#9333EA',
    targetPath: '/(main)/chat',
  },
  {
    id: 'contacts',
    name: 'Contactos',
    description: 'Busca profesionales y empresas en la red BeeApp, gestiona tus contactos y revisa el historial de llamadas.',
    category: 'Comunicación',
    icon: Users,
    bgColor: '#FEE2E2',
    iconColor: '#DC2626',
    targetPath: '/(main)/contacts',
  },
  // Productividad
  {
    id: 'notes',
    name: 'Notas',
    description: 'Anotaciones rápidas y recordatorios sincronizados.',
    category: 'Productividad',
    icon: FileText,
    bgColor: '#FEF3C7',
    iconColor: '#D97706',
    targetPath: '/(main)/notes',
  },
  {
    id: 'calendar',
    name: 'Agenda',
    description: 'Organiza tus reuniones, citas y cronograma diario.',
    category: 'Productividad',
    icon: Calendar,
    bgColor: '#F3E8FF',
    iconColor: '#7C3AED',
    targetPath: '/(main)/calendar',
  },
  {
    id: 'files',
    name: 'Almacenamiento',
    description: 'Organización de archivos y firma digital de documentos NDA integrados.',
    category: 'Productividad',
    icon: Folder,
    bgColor: '#ECFDF5',
    iconColor: '#059669',
    targetPath: '/(main)/storage',
  },
  // Próximamente
  {
    id: 'communities',
    name: 'Comunidades',
    description: 'Grupos de discusión corporativa masivos y foros con tus clientes.',
    category: 'Próximamente',
    icon: Globe,
    bgColor: '#F3F4F6',
    iconColor: '#9CA3AF',
    isUpcoming: true,
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const highlightedSection = params.section as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(highlightedSection || null);

  useEffect(() => {
    if (highlightedSection) {
      setHighlightId(highlightedSection);
      const timer = setTimeout(() => {
        setHighlightId(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [highlightedSection]);

  const handleModulePress = (module: ModuleDef) => {
    if (module.isUpcoming) {
      Alert.alert(
        'Próximamente',
        `El módulo "${module.name}" llegará en las próximas versiones de BeeApp AI.`
      );
      return;
    }

    if (module.targetPath) {
      router.push(module.targetPath);
    } else {
      Alert.alert(
        module.name,
        `${module.description}\n\nEste módulo está siendo preparado para sincronizar con BeeAI. Pronto estará disponible.`,
        [
          { text: 'Aceptar', style: 'default' },
          {
            text: 'Ver en integraciones',
            onPress: () => router.push('/(main)/profile/integrations'),
            style: 'cancel',
          },
        ]
      );
    }
  };

  const filteredModules = ALL_MODULES.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const comModules = filteredModules.filter((m) => m.category === 'Comunicación');
  const prodModules = filteredModules.filter((m) => m.category === 'Productividad');
  const upModules = filteredModules.filter((m) => m.category === 'Próximamente');

  const renderModuleCard = (item: ModuleDef) => {
    const IconComponent = item.icon;
    const isHighlighted = highlightId === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.moduleCard,
          item.isUpcoming && styles.moduleCardDisabled,
          isHighlighted && styles.moduleCardHighlighted,
        ]}
        onPress={() => handleModulePress(item)}
        activeOpacity={item.isUpcoming ? 0.9 : 0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
          <IconComponent size={20} color={item.iconColor} />
        </View>

        <View style={styles.cardDetailsCol}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.moduleNameText}>{item.name}</Text>
            {item.isUpcoming && (
              <View style={styles.upcomingBadge}>
                <Lock size={10} color="#9CA3AF" style={{ marginRight: 3 }} />
                <Text style={styles.upcomingBadgeText}>Próximamente</Text>
              </View>
            )}
            {isHighlighted && (
              <View style={styles.highlightBadge}>
                <Sparkles size={10} color={colors.neutral.white} style={{ marginRight: 3 }} />
                <Text style={styles.highlightBadgeText}>Sugerido</Text>
              </View>
            )}
          </View>
          <Text style={styles.moduleDescText}>{item.description}</Text>
        </View>

        {!item.isUpcoming && (
          <ChevronRight size={18} color={colors.neutral.gray500} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Title */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Explora</Text>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchBarBox}>
          <Search size={18} color={colors.neutral.gray500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar módulos o funciones..."
            placeholderTextColor={colors.neutral.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Communication Group */}
          {comModules.length > 0 && (
            <View style={styles.categoryGroup}>
              <Text style={styles.groupTitle}>Comunicación</Text>
              <View style={styles.cardsCol}>
                {comModules.map(renderModuleCard)}
              </View>
            </View>
          )}

          {/* Productivity Group */}
          {prodModules.length > 0 && (
            <View style={styles.categoryGroup}>
              <Text style={styles.groupTitle}>Productividad</Text>
              <View style={styles.cardsCol}>
                {prodModules.map(renderModuleCard)}
              </View>
            </View>
          )}

          {/* Upcoming Group */}
          {upModules.length > 0 && (
            <View style={styles.categoryGroup}>
              <Text style={styles.groupTitle}>Próximamente</Text>
              <View style={styles.cardsCol}>
                {upModules.map(renderModuleCard)}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Menu tab bar */}
        <FloatingTabBar activeTab="explore" />
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
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.text,
    paddingVertical: 6,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  categoryGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  cardsCol: {
    gap: 12,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  moduleCardDisabled: {
    opacity: 0.7,
  },
  moduleCardHighlighted: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FBFBFF',
    borderWidth: 1.5,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardDetailsCol: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  moduleNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  upcomingBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral.gray600,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  highlightBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  moduleDescText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    lineHeight: 16,
  },
});
