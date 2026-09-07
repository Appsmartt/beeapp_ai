import {
useCallback,
useEffect,
useState,
} from 'react';
import {
ActivityIndicator,
RefreshControl,
ScrollView,
StyleSheet,
Text,
TouchableOpacity,
View,
} from 'react-native';
import {
ArrowLeft,
Package,
Wrench,
} from 'lucide-react-native';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';

import type {
CommercialRequestDetail,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
type CommercialUiError,
} from '../../../../src/features/buddyservices/commercialErrors';
import {
getCommercialRequestItemLabel,
getCommercialRequestItemPriceLabel,
getCommercialRequestItemsTitle,
getCommercialRequestLineComment,
getCommercialRequestTotalLabel,
getCommercialRequestTotalState,
} from '../../../../src/features/buddyservices/commercialRequestDetailPresentation';

import {
loadCommercialRequest,
} from '../../../../src/services/commercialService';

function normalizeParam(
value: string | string[] | undefined,
): string {
if (Array.isArray(value)) {
return String(value[0] || '').trim();
}

return String(value || '').trim();
}

function formatCop(
amount: number | null,
): string {
if (amount === null) {
return 'Pendiente de confirmación';
}

return new Intl.NumberFormat(
'es-CO',
{
currency: 'COP',
maximumFractionDigits: 0,
style: 'currency',
},
).format(amount);
}

function modalityLabel(value: string | null): string {
const labels: Record<string, string> = {
at_establishment: 'En establecimiento',
in_person: 'Presencial',
virtual: 'Virtual',
home_visit: 'Visita a domicilio',
delivery: 'Entrega a domicilio',
pickup: 'Recoger en negocio',
phone_call: 'Llamada telefónica',
buddy_chat: 'Chat Buddy',
};

return value ? labels[value] || value : 'Por confirmar';
}

function statusLabel(value: string): string {
const labels: Record<string, string> = {
draft: 'Borrador',
submitted: 'Solicitud enviada',
under_review: 'En revisión',
proposal_sent: 'Propuesta recibida',
accepted: 'Aceptada',
payment_pending: 'Pago pendiente',
payment_submitted: 'Pago enviado',
confirmed: 'Confirmada',
completed: 'Completada',
rejected: 'Rechazada',
cancelled: 'Cancelada',
expired: 'Vencida',
disputed: 'En disputa',
};

return labels[value] || value;
}

export default function BuddyServicesRequestDetailScreen() {
const router = useRouter();
const params = useLocalSearchParams<{
requestId?: string | string[];
}>();

const requestId = normalizeParam(params.requestId);

const [requestDetail, setRequestDetail] = useState<
CommercialRequestDetail | null
>(null);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState<CommercialUiError | null>(
null,
);

const loadRequest = useCallback(async () => {
if (!requestId) {
setLoading(false);
setError({
title: 'Solicitud no identificada',
message: 'No fue posible identificar la solicitud comercial.',
retryable: false,
});
return;
}

setLoading(true);
setError(null);

try {
const response = await loadCommercialRequest(requestId);
setRequestDetail(response.request);
} catch (loadError) {
setError(toCommercialUiError(loadError));
} finally {
setLoading(false);
}
}, [requestId]);

useEffect(() => {
void loadRequest();
}, [loadRequest]);

const handleRefresh = useCallback(async () => {
setRefreshing(true);

try {
await loadRequest();
} finally {
setRefreshing(false);
}
}, [loadRequest]);

const handleBack = useCallback(() => {
if (router.canGoBack()) {
router.back();
return;
}

router.replace('/(main)/beeservices/my-purchases');
}, [router]);

if (loading) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<ActivityIndicator color="#7427D5" size="large" />
<Text style={styles.centeredText}>
Cargando solicitud...
</Text>
</View>
</ScreenSafeArea>
);
}

if (error || !requestDetail) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<Text style={styles.errorTitle}>
{error?.title || 'Solicitud no disponible'}
</Text>
<Text style={styles.errorText}>
{error?.message || 'No fue posible cargar esta solicitud.'}
</Text>
{error?.retryable ? (
<TouchableOpacity
accessibilityLabel="Reintentar cargar solicitud"
accessibilityRole="button"
onPress={() => {
void loadRequest();
}}
style={styles.primaryButton}
>
<Text style={styles.primaryButtonText}>
Reintentar
</Text>
</TouchableOpacity>
) : null}
<TouchableOpacity
accessibilityLabel="Volver a solicitudes"
accessibilityRole="button"
onPress={handleBack}
style={styles.secondaryButton}
>
<Text style={styles.secondaryButtonText}>
Volver
</Text>
</TouchableOpacity>
</View>
</ScreenSafeArea>
);
}

return (
<ScreenSafeArea style={styles.safeArea}>
<ScrollView
contentContainerStyle={styles.content}
refreshControl={
<RefreshControl
refreshing={refreshing}
onRefresh={handleRefresh}
tintColor="#7427D5"
/>
}
>
<View style={styles.header}>
<TouchableOpacity
accessibilityLabel="Volver"
accessibilityRole="button"
onPress={handleBack}
style={styles.backButton}
>
<ArrowLeft color="#38294E" size={22} />
</TouchableOpacity>
<View style={styles.headerText}>
<Text style={styles.eyebrow}>
Solicitud formal
</Text>
<Text style={styles.title}>
{requestDetail.code}
</Text>
</View>
</View>

<View style={styles.statusCard}>
<Text style={styles.statusLabel}>
Estado actual
</Text>
<Text style={styles.statusValue}>
{statusLabel(requestDetail.status)}
</Text>
<Text style={styles.statusHint}>
Esta solicitud no es un pedido final hasta que el
negocio la acepte o acuerde las condiciones.
</Text>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>
Resumen
</Text>
<Text style={styles.row}>
Modalidad: {modalityLabel(requestDetail.requested_modality)}
</Text>
{requestDetail.delivery_address ? (
<Text style={styles.row}>
Dirección: {requestDetail.delivery_address}
</Text>
) : null}
{requestDetail.delivery_reference ? (
<Text style={styles.row}>
Referencia: {requestDetail.delivery_reference}
</Text>
) : null}
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>
{getCommercialRequestItemsTitle(requestDetail.request_type)}
</Text>
{requestDetail.items.map((item) => {
const lineComment = getCommercialRequestLineComment(item);
const isService = item.offer_kind === 'service';

return (
<View key={item.id} style={styles.itemCard}>
<View style={styles.itemHeader}>
{isService ? (
<Wrench color="#7427D5" size={18} />
) : (
<Package color="#7427D5" size={18} />
)}
<Text style={styles.itemTitle}>
{item.title}
</Text>
</View>

<Text style={styles.itemMeta}>
{getCommercialRequestItemLabel(item)}
</Text>

<Text style={styles.itemMeta}>
Cantidad: {item.quantity}
</Text>

<Text style={styles.itemMeta}>
{getCommercialRequestItemPriceLabel(item, formatCop)}
</Text>

{item.pricing_strategy === 'starting_at' ? (
<Text style={styles.itemHint}>
El valor “desde” no es un total final.
</Text>
) : null}

{item.pricing_strategy === 'to_be_confirmed' ? (
<Text style={styles.itemHint}>
El negocio confirmará el valor dentro de la solicitud.
</Text>
) : null}

{lineComment ? (
<View style={styles.lineCommentBox}>
<Text style={styles.lineCommentLabel}>
Comentario de esta línea
</Text>
<Text style={styles.lineCommentText}>
{lineComment}
</Text>
</View>
) : null}
</View>
);
})}
</View>

{(() => {
const totalState = getCommercialRequestTotalState(requestDetail);

return (
<View style={styles.totalCard}>
<Text style={styles.totalRow}>
Subtotal: {formatCop(requestDetail.subtotal_amount)}
</Text>
<Text style={styles.totalRow}>
Domicilio: {formatCop(requestDetail.delivery_fee_amount)}
</Text>
<Text style={styles.totalValue}>
{getCommercialRequestTotalLabel(totalState)}: {formatCop(
requestDetail.total_amount,
)}
</Text>
{totalState === 'estimated' ? (
<Text style={styles.totalHint}>
Incluye valores “desde”; no es un total final.
</Text>
) : totalState === 'pending_confirmation' ? (
<Text style={styles.totalHint}>
El negocio confirmará los valores pendientes.
</Text>
) : null}
</View>
);
})()}

{requestDetail.customer_note ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Comentario
</Text>
<Text style={styles.row}>
{requestDetail.customer_note}
</Text>
</View>
) : null}
</ScrollView>
</ScreenSafeArea>
);
}

const styles = StyleSheet.create({
safeArea: {
backgroundColor: '#F8F7FC',
flex: 1,
},
content: {
gap: 16,
padding: 20,
paddingBottom: 36,
},
centered: {
alignItems: 'center',
flex: 1,
justifyContent: 'center',
padding: 28,
},
centeredText: {
color: '#6E6281',
fontSize: 15,
marginTop: 12,
},
errorTitle: {
color: '#38294E',
fontSize: 20,
fontWeight: '700',
textAlign: 'center',
},
errorText: {
color: '#6E6281',
fontSize: 15,
lineHeight: 22,
marginTop: 8,
textAlign: 'center',
},
header: {
alignItems: 'center',
flexDirection: 'row',
gap: 12,
},
backButton: {
alignItems: 'center',
backgroundColor: '#FFFFFF',
borderRadius: 20,
height: 40,
justifyContent: 'center',
width: 40,
},
headerText: {
flex: 1,
},
eyebrow: {
color: '#7427D5',
fontSize: 13,
fontWeight: '700',
textTransform: 'uppercase',
},
title: {
color: '#38294E',
fontSize: 23,
fontWeight: '800',
marginTop: 2,
},
statusCard: {
backgroundColor: '#EEE5FF',
borderRadius: 16,
padding: 16,
},
statusLabel: {
color: '#6E6281',
fontSize: 13,
},
statusValue: {
color: '#5420A5',
fontSize: 20,
fontWeight: '800',
marginTop: 4,
},
statusHint: {
color: '#5C5071',
fontSize: 13,
lineHeight: 19,
marginTop: 8,
},
section: {
backgroundColor: '#FFFFFF',
borderRadius: 16,
gap: 8,
padding: 16,
},
sectionTitle: {
color: '#38294E',
fontSize: 17,
fontWeight: '800',
},
row: {
color: '#5C5071',
fontSize: 14,
lineHeight: 21,
},
itemCard: {
borderColor: '#E6E0EF',
borderRadius: 12,
borderWidth: 1,
gap: 5,
padding: 12,
},
itemHeader: {
alignItems: 'center',
flexDirection: 'row',
gap: 8,
},
itemTitle: {
color: '#38294E',
flex: 1,
fontSize: 15,
fontWeight: '700',
},
itemMeta: {
color: '#6E6281',
fontSize: 14,
},
itemHint: {
color: '#806899',
fontSize: 12,
lineHeight: 18,
marginTop: 2,
},
lineCommentBox: {
backgroundColor: '#F8F4FC',
borderColor: '#E7DDF0',
borderRadius: 10,
borderWidth: 1,
marginTop: 8,
padding: 10,
},
lineCommentLabel: {
color: '#6A4B8B',
fontSize: 12,
fontWeight: '700',
},
lineCommentText: {
color: '#4E405E',
fontSize: 13,
lineHeight: 19,
marginTop: 4,
},
totalCard: {
backgroundColor: '#38294E',
borderRadius: 16,
gap: 7,
padding: 16,
},
totalRow: {
color: '#E9E0F5',
fontSize: 14,
},
totalValue: {
color: '#FFFFFF',
fontSize: 18,
fontWeight: '800',
marginTop: 4,
},
totalHint: {
color: '#DED2EB',
fontSize: 12,
lineHeight: 18,
marginTop: 5,
},
primaryButton: {
backgroundColor: '#7427D5',
borderRadius: 12,
marginTop: 18,
paddingHorizontal: 20,
paddingVertical: 13,
},
primaryButtonText: {
color: '#FFFFFF',
fontSize: 15,
fontWeight: '700',
},
secondaryButton: {
marginTop: 14,
padding: 12,
},
secondaryButtonText: {
color: '#7427D5',
fontSize: 15,
fontWeight: '700',
},
});
