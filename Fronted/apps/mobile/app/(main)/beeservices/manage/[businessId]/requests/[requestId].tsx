import {
useCallback,
useEffect,
useState,
} from 'react';
import {
ActivityIndicator,
Alert,
RefreshControl,
ScrollView,
StyleSheet,
Text,
TouchableOpacity,
View,
} from 'react-native';
import {
ArrowLeft,
ClipboardList,
Package,
Wrench,
} from 'lucide-react-native';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';

import type {
CommercialRequestDetail,
CommercialRequestTimeline,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
type CommercialUiError,
} from '../../../../../../src/features/buddyservices/commercialErrors';
import {
buddyServicesManageRequestsRoute,
} from '../../../../../../src/features/buddyservices/commercialRoutes';
import {
getCommercialRequestItemLabel,
getCommercialRequestItemPriceLabel,
getCommercialRequestItemsTitle,
getCommercialRequestLineComment,
getCommercialRequestTotalLabel,
getCommercialRequestTotalState,
} from '../../../../../../src/features/buddyservices/commercialRequestDetailPresentation';
import {
completeOwnedCommercialRequest,
loadCommercialRequest,
loadCommercialRequestTimeline,
withdrawCommercialProposal,
} from '../../../../../../src/services/commercialService';

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
proposal_sent: 'Propuesta enviada',
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

function formatTimelineDate(
value: string,
): string {
const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Fecha no disponible';
}

return new Intl.DateTimeFormat(
'es-CO',
{
dateStyle: 'medium',
timeStyle: 'short',
},
).format(date);
}

function proposalStatusLabel(status: string): string {
const labels: Record<string, string> = {
pending: 'Pendiente',
accepted: 'Aceptada',
rejected: 'Rechazada',
superseded: 'Reemplazada',
expired: 'Vencida',
withdrawn: 'Retirada',
};

return labels[status] || status;
}

function timelineEventLabel(eventType: string): string {
const labels: Record<string, string> = {
request_submitted: 'Solicitud recibida',
request_under_review: 'Solicitud en revisión',
request_accepted: 'Solicitud aceptada',
request_rejected: 'Solicitud rechazada',
request_cancelled: 'Solicitud cancelada',
request_completed: 'Solicitud completada',
proposal_created: 'Propuesta creada',
proposal_received: 'Propuesta enviada',
proposal_accepted: 'Propuesta aceptada',
proposal_rejected: 'Propuesta rechazada',
proposal_withdrawn: 'Propuesta retirada',
payment_requested: 'Pago solicitado',
payment_proof_submitted: 'Comprobante enviado',
payment_proof_rejected: 'Comprobante rechazado',
payment_proof_confirmed: 'Comprobante confirmado',
};

return labels[eventType] || 'Actualización de solicitud';
}

export default function BuddyServicesManageRequestDetailScreen() {
const router = useRouter();
const params = useLocalSearchParams<{
businessId?: string | string[];
requestId?: string | string[];
}>();

const businessId = normalizeParam(params.businessId);
const requestId = normalizeParam(params.requestId);

const [requestDetail, setRequestDetail] = useState<
CommercialRequestDetail | null
>(null);
const [timeline, setTimeline] = useState<
CommercialRequestTimeline | null
>(null);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState<CommercialUiError | null>(
null,
);
const [actionError, setActionError] = useState<
CommercialUiError | null
>(null);
const [pendingAction, setPendingAction] = useState<
string | null
>(null);

const loadRequest = useCallback(async () => {
if (!businessId || !requestId) {
setError({
title: 'Solicitud no identificada',
message: 'No fue posible identificar el negocio o la solicitud.',
retryable: false,
});
setLoading(false);
return;
}

setLoading(true);
setError(null);

try {
const [requestResult, timelineResult] = await Promise.allSettled([
loadCommercialRequest(requestId),
loadCommercialRequestTimeline(requestId),
]);

if (requestResult.status === 'rejected') {
setError(toCommercialUiError(requestResult.reason));
setRequestDetail(null);
setTimeline(null);
return;
}

if (
requestResult.value.request.commercial_profile_id
!== businessId
) {
setError({
title: 'Sin acceso',
message: (
'Esta solicitud no pertenece al negocio que estás '
+ 'gestionando.'
),
retryable: false,
});
setRequestDetail(null);
setTimeline(null);
return;
}

setRequestDetail(requestResult.value.request);

if (timelineResult.status === 'fulfilled') {
setTimeline(timelineResult.value.timeline);
} else {
setTimeline(null);
}
} finally {
setLoading(false);
}
}, [
businessId,
requestId,
]);

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

if (businessId) {
router.replace(
buddyServicesManageRequestsRoute(businessId),
);
}
}, [
businessId,
router,
]);

const runAction = useCallback(async (
actionKey: string,
operation: () => Promise<unknown>,
successMessage: string,
) => {
setPendingAction(actionKey);
setActionError(null);

try {
await operation();
Alert.alert('Solicitud actualizada', successMessage);
await loadRequest();
} catch (actionErrorValue) {
setActionError(toCommercialUiError(actionErrorValue));
} finally {
setPendingAction(null);
}
}, [loadRequest]);

const confirmCompleteRequest = useCallback(() => {
Alert.alert(
'Completar solicitud',
'Confirma que la atención, reserva o entrega se completó correctamente.',
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Completar',
onPress: () => {
void runAction(
'complete',
() => completeOwnedCommercialRequest(requestId, {}),
'La solicitud fue marcada como completada.',
);
},
},
],
);
}, [
requestId,
runAction,
]);

const confirmWithdrawProposal = useCallback((
proposalId: string,
) => {
Alert.alert(
'Retirar propuesta',
'La propuesta dejará de estar disponible para el cliente.',
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Retirar',
style: 'destructive',
onPress: () => {
void runAction(
`withdraw:${proposalId}`,
() => withdrawCommercialProposal(proposalId, {}),
'La propuesta fue retirada.',
);
},
},
],
);
}, [runAction]);

if (loading) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<ActivityIndicator color="#7427D5" size="large" />
<Text style={styles.centeredText}>
Cargando solicitud del negocio...
</Text>
</View>
</ScreenSafeArea>
);
}

if (error || !requestDetail) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<ClipboardList color="#7427D5" size={36} />
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
colors={['#7427D5']}
onRefresh={handleRefresh}
refreshing={refreshing}
tintColor="#7427D5"
/>
}
>
<View style={styles.header}>
<TouchableOpacity
accessibilityLabel="Volver a solicitudes del negocio"
accessibilityRole="button"
onPress={handleBack}
style={styles.backButton}
>
<ArrowLeft color="#38294E" size={22} />
</TouchableOpacity>

<View style={styles.headerText}>
<Text style={styles.eyebrow}>
Solicitud recibida
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
Dirección de entrega: {requestDetail.delivery_address}
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
{lineComment ? (
<View style={styles.lineCommentBox}>
<Text style={styles.lineCommentLabel}>
Comentario de la solicitud
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
</View>
);
})()}

{actionError ? (
<View style={styles.actionErrorCard}>
<Text style={styles.actionErrorTitle}>
{actionError.title}
</Text>
<Text style={styles.actionErrorText}>
{actionError.message}
</Text>
</View>
) : null}

{requestDetail.status === 'confirmed' ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Acciones
</Text>
<Text style={styles.row}>
Confirma la finalización solo cuando la atención, reserva o entrega haya concluido.
</Text>
<TouchableOpacity
accessibilityLabel="Marcar solicitud como completada"
accessibilityRole="button"
disabled={pendingAction !== null}
onPress={confirmCompleteRequest}
style={[
styles.primaryButton,
pendingAction !== null
? styles.disabledButton
: null,
]}
>
<Text style={styles.primaryButtonText}>
{pendingAction === 'complete'
? 'Completando...'
: 'Marcar como completada'}
</Text>
</TouchableOpacity>
</View>
) : null}

{timeline ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Historial y propuestas
</Text>

{timeline.proposals.length > 0 ? (
<View style={styles.timelineGroup}>
<Text style={styles.timelineGroupTitle}>
Propuestas
</Text>
{timeline.proposals.map((proposal) => (
<View key={proposal.id} style={styles.timelineCard}>
<Text style={styles.timelineTitle}>
Propuesta #{proposal.version_number} · {proposalStatusLabel(
proposal.status,
)}
</Text>
<Text style={styles.timelineText}>
Total: {formatCop(proposal.total_amount)}
</Text>
{proposal.proposed_starts_at ? (
<Text style={styles.timelineText}>
Inicio: {formatTimelineDate(proposal.proposed_starts_at)}
</Text>
) : null}
{proposal.note ? (
<Text style={styles.timelineText}>
{proposal.note}
</Text>
) : null}
{proposal.status === 'pending' ? (
<TouchableOpacity
accessibilityLabel={`Retirar propuesta ${proposal.version_number}`}
accessibilityRole="button"
disabled={pendingAction !== null}
onPress={() => confirmWithdrawProposal(proposal.id)}
style={[
styles.withdrawButton,
pendingAction !== null
? styles.disabledButton
: null,
]}
>
<Text style={styles.withdrawButtonText}>
{pendingAction === `withdraw:${proposal.id}`
? 'Retirando...'
: 'Retirar propuesta'}
</Text>
</TouchableOpacity>
) : null}
</View>
))}
</View>
) : null}

{timeline.events.length > 0 ? (
<View style={styles.timelineGroup}>
<Text style={styles.timelineGroupTitle}>
Movimientos
</Text>
{timeline.events.map((event) => (
<View key={event.id} style={styles.timelineCard}>
<Text style={styles.timelineTitle}>
{timelineEventLabel(event.event_type)}
</Text>
<Text style={styles.timelineText}>
{formatTimelineDate(event.created_at)}
</Text>
{event.reason_text ? (
<Text style={styles.timelineText}>
{event.reason_text}
</Text>
) : null}
</View>
))}
</View>
) : null}

{timeline.proposals.length === 0
&& timeline.events.length === 0 ? (
<Text style={styles.row}>
Aún no hay movimientos registrados.
</Text>
) : null}
</View>
) : (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Historial
</Text>
<Text style={styles.row}>
No fue posible cargar el historial en este momento.
</Text>
</View>
)}

{requestDetail.customer_note ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Comentario del cliente
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
textAlign: 'center',
},
errorTitle: {
color: '#38294E',
fontSize: 20,
fontWeight: '800',
marginTop: 14,
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
timelineGroup: {
gap: 8,
marginTop: 6,
},
timelineGroupTitle: {
color: '#5C5071',
fontSize: 14,
fontWeight: '700',
},
timelineCard: {
backgroundColor: '#F8F4FC',
borderColor: '#E7DDF0',
borderRadius: 10,
borderWidth: 1,
gap: 4,
padding: 10,
},
timelineTitle: {
color: '#4E405E',
fontSize: 14,
fontWeight: '700',
},
timelineText: {
color: '#6E6281',
fontSize: 13,
lineHeight: 18,
},
actionErrorCard: {
backgroundColor: '#FCE3E5',
borderColor: '#EABBC0',
borderRadius: 14,
borderWidth: 1,
gap: 4,
padding: 14,
},
actionErrorTitle: {
color: '#8A2533',
fontSize: 15,
fontWeight: '800',
},
actionErrorText: {
color: '#7A3B46',
fontSize: 13,
lineHeight: 19,
},
primaryButton: {
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 12,
marginTop: 8,
paddingHorizontal: 18,
paddingVertical: 13,
},
primaryButtonText: {
color: '#FFFFFF',
fontSize: 14,
fontWeight: '800',
},
withdrawButton: {
alignSelf: 'flex-start',
backgroundColor: '#EEE7F3',
borderRadius: 8,
marginTop: 6,
paddingHorizontal: 10,
paddingVertical: 8,
},
withdrawButtonText: {
color: '#5E506B',
fontSize: 12,
fontWeight: '800',
},
disabledButton: {
opacity: 0.55,
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
