import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  MessageCircle,
  Mail,
  Calendar,
  FileText,
  FolderOpen,
  ShoppingBag,
  ChevronRight,
  Search,
  TrendingUp,
  Video,
} from 'lucide-react-native';
import { useModuleNav, useScreenParams } from '../embedded/EmbeddedNavContext';
import { styles } from './allModulesOverviewStyles';

const MOCK_AVATARS = [
  { initials: 'CM', bg: '#DBEAFE', text: '#1E40AF' },
  { initials: 'MA', bg: '#FEF3C7', text: '#92400E' },
  { initials: 'JP', bg: '#ECFDF5', text: '#065F46' },
];


export default function AllModulesOverview() {
  const router = useModuleNav();
  const params = useScreenParams();
  const onOpenModule = params.onOpenModule as ((id: string) => void) | undefined;

  const handleOpenModule = (id: string) => {
    if (onOpenModule) {
      onOpenModule(id);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 1. TARJETA BEESERVICES (ARRIBA DE TODO - RESALTADA EN MORADO SÓLIDO) */}
      <TouchableOpacity
        style={styles.beeServicesCard}
        activeOpacity={0.85}
        onPress={() => handleOpenModule('beeservices')}
      >
        <View style={styles.beeServicesTopRow}>
          <View style={styles.beeServicesIconWrap}>
            <ShoppingBag size={32} color={colors.brand.primary} />
          </View>
          <View style={styles.beeServicesTextCol}>
            <Text style={styles.beeServicesTitle}>BeeServices</Text>
            <Text style={styles.beeServicesSubtitle}>Tus negocios y catálogo comercial</Text>
          </View>
          <ChevronRight size={24} color={colors.brand.primary} />
        </View>

        <Text style={styles.beeServicesDescText}>
          Crea tu negocio, publica productos y servicios. Los clientes te encontrarán a través del asistente de IA.
        </Text>

        {/* Badges de métricas en Morado */}
        <View style={styles.beeServicesMetricsRow}>
          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>2 Negocios</Text>
          </View>
          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>4 Productos</Text>
          </View>
          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>3 Servicios</Text>
          </View>
          <View style={styles.beeMetricBadge}>
            <Text style={styles.beeMetricText}>12 Consultas recibidas</Text>
          </View>
        </View>

        {/* 3 Características destacadas */}
        <View style={styles.beeServicesHighlightsRow}>
          <View style={styles.beeHighlightItem}>
            <Search size={14} color={colors.brand.primary} />
            <Text style={styles.beeHighlightText}>Los clientes te encuentran vía IA</Text>
          </View>
          <View style={styles.beeHighlightItem}>
            <MessageCircle size={14} color={colors.brand.primary} />
            <Text style={styles.beeHighlightText}>Chat directo con compradores</Text>
          </View>
          <View style={styles.beeHighlightItem}>
            <TrendingUp size={14} color={colors.brand.primary} />
            <Text style={styles.beeHighlightText}>Visibilidad en la red empresarial</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 2. GRID DE MÓDULOS DE 2 COLUMNAS (ÍCONOS MORADOS 70% OPACIDAD, BADGES EQUILIBRADOS) */}
      <View style={styles.gridContainer}>
        {/* Fila 1: Chat & Correos */}

        {/* Tarjeta CHAT */}
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('chat')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <MessageCircle size={26} color="#000000ff" />
            </View>

            <Text style={styles.cardTitle}>Chat</Text>
            <Text style={styles.cardSubtitle}>Mensajería</Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>3 Nuevos</Text>
              </View>
              <View style={styles.badgePillRed}>
                <Text style={styles.badgeTextRed}>1 Llamada perdida</Text>
              </View>
              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>2 Grupos activos</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <View style={styles.avatarsFooterRow}>
              <View style={styles.avatarsOverlap}>
                {MOCK_AVATARS.map((av, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: av.bg },
                      idx > 0 && { marginLeft: -6 },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color: av.text }]}>{av.initials}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.avatarsLabel} numberOfLines={1}>Carlos, María y 1 más</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Tarjeta CORREOS */}
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('mail')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <Mail size={26} color="#000000ff" />
            </View>

            <Text style={styles.cardTitle}>Correos</Text>
            <Text style={styles.cardSubtitle}>Bandeja inteligente</Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>5 Sin leer</Text>
              </View>
              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>2 Con adjuntos</Text>
              </View>
              <View style={styles.badgePillOrange}>
                <Text style={styles.badgeTextOrange}>1 Importante</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <Text style={styles.cardPreviewText} numberOfLines={1}>
              Carlos M. - Avance del proyecto Q3...
            </Text>
          </View>
        </TouchableOpacity>

        {/* Fila 2: Agenda & Notas */}

        {/* Tarjeta AGENDA */}
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('calendar')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <Calendar size={26} color="#000000ff" />
            </View>

            <Text style={styles.cardTitle}>Agenda</Text>
            <Text style={styles.cardSubtitle}>Calendario</Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>3 Hoy</Text>
              </View>
              <View style={styles.badgePillOrange}>
                <Text style={styles.badgeTextOrange}>1 Reunión en 45 min</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <View style={styles.eventFooterRow}>
              <Video size={13} color="#6025d2B3" />
              <Text style={styles.cardPreviewText} numberOfLines={1}>
                14:00 - Sincronización semanal
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Tarjeta NOTAS */}
        <TouchableOpacity
          style={styles.gridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('notes')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <FileText size={26} color="#000000ff" />
            </View>

            <Text style={styles.cardTitle}>Notas</Text>
            <Text style={styles.cardSubtitle}>Apuntes rápidos</Text>

            <View style={styles.badgesContainer}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>3 Nuevas</Text>
              </View>
              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>2 Protegidas</Text>
              </View>
              <View style={styles.badgePillGray}>
                <Text style={styles.badgeTextGray}>1 Recordatorio</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <Text style={styles.cardPreviewText} numberOfLines={1}>
              Estrategia comercial Q3...
            </Text>
          </View>
        </TouchableOpacity>

        {/* Fila 3: Archivos (Almacenamiento - Ancho Completo) */}
        <TouchableOpacity
          style={styles.fullWidthGridCard}
          activeOpacity={0.8}
          onPress={() => handleOpenModule('files')}
        >
          <View>
            <View style={styles.cardHeaderRow}>
              <FolderOpen size={26} color="#000000ff" />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>57% usado</Text>
                </View>
                <View style={styles.badgePillGray}>
                  <Text style={styles.badgeTextGray}>8.5 GB de 15 GB</Text>
                </View>
              </View>
            </View>

            <Text style={styles.cardTitle}>Archivos</Text>
            <Text style={styles.cardSubtitle}>Almacenamiento</Text>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '57%' }]} />
            </View>
          </View>

          <View style={styles.cardFooterBox}>
            <View style={styles.fileMiniRow}>
              <Text style={styles.fileNameText} numberOfLines={1}>• Contrato_Cliente_Q3.pdf</Text>
              <Text style={styles.fileSizeText}>2.4 MB</Text>
            </View>
            <View style={styles.fileMiniRow}>
              <Text style={styles.fileNameText} numberOfLines={1}>• Presentación_Ventas.pdf</Text>
              <Text style={styles.fileSizeText}>5.1 MB</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
