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
Package,
Wrench,
} from 'lucide-react-native';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import type {
CommercialRequestDetail,
CommercialRequestDetailContext,
CommercialRequestTimeline,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
type CommercialUiError,
} from '../../../../src/features/buddyservices/commercialErrors';
import {
presentCommercialReservation,
} from '../../../../src/features/buddyservices/commercialReservationPresentation';
import {
getCommercialRequestItemLabel,
getCommercialRequestItemPriceLabel,
getCommercialRequestItemsTitle,
getCommercialRequestLineComment,
getCommercialRequestTotalLabel,
getCommercialRequestTotalState,
} from '../../../../src/features/buddyservices/commercialRequestDetailPresentation';

import {
acceptCommercialProposal,
loadCommercialRequestFormalDetail,
rejectCommercialProposal,
replaceRejectedCommercialPaymentProof,
} from '../../../../src/services/commercialService';
import {
uploadCommercialPaymentProof,
} from '../../../../src/services/commercialPaymentProofService';
import {
getValidSessionCredentials,
} from '../../../../src/services/authSession';

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

function timelineEventLabel(eventType: string): string {
const labels: Record<string, string> = {
request_submitted: 'Solicitud enviada',
request_under_review: 'Solicitud en revisión',
request_accepted: 'Solicitud aceptada',
request_rejected: 'Solicitud rechazada',
request_cancelled: 'Solicitud cancelada',
request_completed: 'Solicitud completada',
proposal_created: 'Propuesta creada',
proposal_received: 'Propuesta recibida',
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

export default function BuddyServicesRequestDetailScreen() {
const router = useRouter();
const params = useLocalSearchParams<{
requestId?: string | string[];
}>();

const requestId = normalizeParam(params.requestId);

const [requestDetail, setRequestDetail] = useState<
CommercialRequestDetail | null
>(null);
const [timeline, setTimeline] = useState<
CommercialRequestTimeline | null
>(null);
const [formalContext, setFormalContext] = useState<
CommercialRequestDetailContext | null
>(null);
const [timelineError, setTimelineError] = useState<
CommercialUiError | null
>(null);
const [actionError, setActionError] = useState<
CommercialUiError | null
>(null);
const [pendingAction, setPendingAction] = useState<
string | null
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
const response = await loadCommercialRequestFormalDetail(
requestId,
);

setRequestDetail(response.request);
setFormalContext(response.context);
setTimeline(response.context.timeline);
setTimelineError(null);
} catch (loadError) {
setError(toCommercialUiError(loadError));
setRequestDetail(null);
setFormalContext(null);
setTimeline(null);
setTimelineError(null);
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

const runRequestAction = useCallback(async (
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
} catch (operationError) {
setActionError(toCommercialUiError(operationError));
} finally {
setPendingAction(null);
}
}, [loadRequest]);

const confirmAcceptProposal = useCallback((
proposalId: string,
) => {
Alert.alert(
'Aceptar propuesta',
'¿Deseas aceptar estas condiciones para la solicitud?',
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Aceptar',
onPress: () => {
void runRequestAction(
`accept:${proposalId}`,
() => acceptCommercialProposal(proposalId),
'La propuesta fue aceptada.',
);
},
},
],
);
}, [runRequestAction]);

const handleReplacePaymentProof = useCallback(async (
paymentProofId: string,
) => {
if (pendingAction !== null) {
return;
}

let selectedProofUri: string | null = null;

try {
const result = await DocumentPicker.getDocumentAsync({
type: [
'application/pdf',
'image/jpeg',
'image/png',
'image/webp',
],
copyToCacheDirectory: true,
multiple: false,
});

if (result.canceled || !result.assets[0]) {
return;
}

const asset = result.assets[0];
selectedProofUri = asset.uri;

setPendingAction(`replace-proof:${paymentProofId}`);
setActionError(null);

const credentials = await getValidSessionCredentials();

if (!credentials) {
throw new Error(
'Tu sesión venció. Inicia sesión nuevamente.',
);
}

const uploadedFile = await uploadCommercialPaymentProof(
credentials,
{
uri: asset.uri,
name: asset.name || 'comprobante',
mimeType: (
asset.mimeType
|| 'application/octet-stream'
),
sizeBytes: asset.size ?? null,
},
);

await replaceRejectedCommercialPaymentProof(
paymentProofId,
{
file_id: uploadedFile.id,
},
);

Alert.alert(
'Comprobante enviado',
'El nuevo comprobante fue enviado para revisión.',
);
await loadRequest();
} catch (replaceError) {
setActionError(toCommercialUiError(replaceError));
} finally {
if (
selectedProofUri
&& FileSystem.cacheDirectory
&& selectedProofUri.startsWith(FileSystem.cacheDirectory)
) {
try {
await FileSystem.deleteAsync(
selectedProofUri,
{
idempotent: true,
},
);
} catch {
// La limpieza temporal no debe afectar el resultado comercial.
}
}

setPendingAction(null);
}
}, [
loadRequest,
pendingAction,
]);

const confirmRejectProposal = useCallback((
proposalId: string,
) => {
Alert.alert(
'Rechazar propuesta',
'La propuesta será rechazada. Podrás continuar negociando si el negocio envía una nueva propuesta.',
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Rechazar',
style: 'destructive',
onPress: () => {
void runRequestAction(
`reject:${proposalId}`,
() => rejectCommercialProposal(proposalId, {}),
'La propuesta fue rechazada.',
);
},
},
],
);
}, [runRequestAction]);

const displayedTimeline = formalContext?.timeline || timeline;

const formatProposalDateTime = (
value: string | null,
timezone: string | null,
): string | null => {
if (!value) {
return null;
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return 'Fecha no disponible';
}

try {
return new Intl.DateTimeFormat('es-CO', {
day: 'numeric',
hour: '2-digit',
minute: '2-digit',
month: 'long',
timeZone: timezone || undefined,
timeZoneName: timezone ? 'short' : undefined,
year: 'numeric',
}).format(date);
} catch {
return formatTimelineDate(value);
}
};

const formatProposalTerms = (
terms: Record<string, unknown>,
): string | null => {
const entries = Object.entries(terms || {})
.filter(([, value]) => (
value !== null
&& value !== undefined
&& String(value).trim().length > 0
))
.map(([key, value]) => `${key}: ${String(value)}`);

return entries.length ? entries.join(' · ') : null;
};

const finalTermsLabel = formatProposalTerms(
requestDetail?.final_terms || {},
);

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

{formalContext?.reservation ? (() => {
const reservationPresentation = presentCommercialReservation(
formalContext.reservation,
);

return (
<View
accessibilityLabel={
`Reserva: ${reservationPresentation.statusLabel}. `
+ `Inicio: ${reservationPresentation.startsAtLabel}. `
+ `Fin: ${reservationPresentation.endsAtLabel}. `
+ (
reservationPresentation.holdExpiresAtLabel
? `El hold vence: ${reservationPresentation.holdExpiresAtLabel}. `
: ''
)
+ (
reservationPresentation.isHoldActive
&& reservationPresentation.holdRemainingSeconds !== null
? `Hold activo: ${Math.ceil(
reservationPresentation.holdRemainingSeconds / 60,
)} minutos restantes.`
: ''
)
}
style={styles.reservationCard}
>
<Text style={styles.reservationTitle}>
Reserva
</Text>
<Text style={styles.reservationStatus}>
{reservationPresentation.statusLabel}
</Text>
<Text style={styles.reservationRow}>
Inicio: {reservationPresentation.startsAtLabel}
</Text>
<Text style={styles.reservationRow}>
Fin: {reservationPresentation.endsAtLabel}
</Text>
{reservationPresentation.holdExpiresAtLabel ? (
<Text style={styles.reservationRow}>
El hold vence: {reservationPresentation.holdExpiresAtLabel}
</Text>
) : null}
{reservationPresentation.isHoldActive
&& reservationPresentation.holdRemainingSeconds !== null ? (
<Text style={styles.holdCountdown}>
Hold activo: {Math.ceil(
reservationPresentation.holdRemainingSeconds / 60,
)} min restantes
</Text>
) : null}
{reservationPresentation.pendingNotice ? (
<Text style={styles.reservationNotice}>
{reservationPresentation.pendingNotice}
</Text>
) : null}
</View>
);
})() : null}

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

{timelineError ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Historial
</Text>
<Text style={styles.row}>
No fue posible cargar el historial de esta solicitud.
</Text>
{timelineError.retryable ? (
<TouchableOpacity
accessibilityLabel="Reintentar cargar historial"
accessibilityRole="button"
onPress={() => {
void loadRequest();
}}
style={styles.inlineButton}
>
<Text style={styles.inlineButtonText}>
Reintentar historial
</Text>
</TouchableOpacity>
) : null}
</View>
) : displayedTimeline ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Historial
</Text>

{displayedTimeline.proposals.length > 0 ? (
<View style={styles.timelineGroup}>
<Text style={styles.timelineGroupTitle}>
Propuestas
</Text>
{displayedTimeline.proposals.map((proposal) => (
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
Inicio: {formatProposalDateTime(
proposal.proposed_starts_at,
proposal.timezone,
)}
</Text>
) : null}
{proposal.proposed_ends_at ? (
<Text style={styles.timelineText}>
Fin: {formatProposalDateTime(
proposal.proposed_ends_at,
proposal.timezone,
)}
</Text>
) : null}
{proposal.timezone ? (
<Text style={styles.timelineText}>
Zona horaria: {proposal.timezone}
</Text>
) : null}
{proposal.requested_modality ? (
<Text style={styles.timelineText}>
Modalidad: {modalityLabel(proposal.requested_modality)}
</Text>
) : null}
{formatProposalTerms(proposal.terms_snapshot) ? (
<Text style={styles.timelineText}>
Condiciones: {formatProposalTerms(proposal.terms_snapshot)}
</Text>
) : null}
{proposal.note ? (
<Text style={styles.timelineText}>
{proposal.note}
</Text>
) : null}

{proposal.status === 'pending'
&& (
formalContext?.permissions.can_accept_proposal
|| formalContext?.permissions.can_reject_proposal
) ? (
<View style={styles.proposalActions}>
{formalContext.permissions.can_accept_proposal ? (
<TouchableOpacity
accessibilityLabel={`Aceptar propuesta ${proposal.version_number}`}
accessibilityRole="button"
disabled={pendingAction !== null}
onPress={() => confirmAcceptProposal(proposal.id)}
style={[
styles.proposalAcceptButton,
pendingAction !== null
? styles.actionButtonDisabled
: null,
]}
>
<Text style={styles.proposalAcceptButtonText}>
{pendingAction === `accept:${proposal.id}`
? 'Aceptando...'
: 'Aceptar'}
</Text>
</TouchableOpacity>
) : null}

{formalContext.permissions.can_reject_proposal ? (
<TouchableOpacity
accessibilityLabel={`Rechazar propuesta ${proposal.version_number}`}
accessibilityRole="button"
disabled={pendingAction !== null}
onPress={() => confirmRejectProposal(proposal.id)}
style={[
styles.proposalRejectButton,
pendingAction !== null
? styles.actionButtonDisabled
: null,
]}
>
<Text style={styles.proposalRejectButtonText}>
{pendingAction === `reject:${proposal.id}`
? 'Rechazando...'
: 'Rechazar'}
</Text>
</TouchableOpacity>
) : null}
</View>
) : null}
</View>
))}
</View>
) : null}

{displayedTimeline.events.length > 0 ? (
<View style={styles.timelineGroup}>
<Text style={styles.timelineGroupTitle}>
Movimientos
</Text>
{displayedTimeline.events.map((event) => (
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

{displayedTimeline.proposals.length === 0
&& displayedTimeline.events.length === 0 ? (
<Text style={styles.row}>
Aún no hay movimientos registrados.
</Text>
) : null}

{(() => {
const rejectedPaymentProofEvents = displayedTimeline.events
.filter(
(event) => event.event_type === 'payment_proof_rejected',
)
.sort((left, right) => (
new Date(right.created_at).getTime()
- new Date(left.created_at).getTime()
));
const latestRejectedPaymentProofEvent = (
rejectedPaymentProofEvents[0]
);

return latestRejectedPaymentProofEvent ? (
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.paymentProofNotice}
>
<Text style={styles.paymentProofNoticeTitle}>
Comprobante rechazado
</Text>
<Text style={styles.paymentProofNoticeText}>
Selecciona un comprobante corregido para enviarlo nuevamente.
</Text>
<TouchableOpacity
accessibilityLabel="Reemplazar comprobante de pago"
accessibilityRole="button"
accessibilityState={{
busy: pendingAction?.startsWith('replace-proof:') || false,
disabled: pendingAction !== null,
}}
disabled={pendingAction !== null}
onPress={() => {
if (latestRejectedPaymentProofEvent.reference_id) {
void handleReplacePaymentProof(
latestRejectedPaymentProofEvent.reference_id,
);
return;
}

setActionError({
title: 'Comprobante no identificado',
message: (
'No fue posible identificar el comprobante rechazado. '
+ 'Actualiza la solicitud e inténtalo nuevamente.'
),
retryable: true,
});
}}
style={[
styles.paymentProofButton,
pendingAction !== null
? styles.actionButtonDisabled
: null,
]}
>
<Text style={styles.paymentProofButtonText}>
{pendingAction?.startsWith('replace-proof:')
? 'Enviando comprobante...'
: 'Reemplazar comprobante'}
</Text>
</TouchableOpacity>
</View>
) : null;
})()}
</View>
) : null}

{finalTermsLabel ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Condiciones finales
</Text>
<Text style={styles.row}>
{finalTermsLabel}
</Text>
</View>
) : null}

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
reservationCard: {
backgroundColor: '#FFF6DF',
borderColor: '#EFCB75',
borderRadius: 14,
borderWidth: 1,
gap: 8,
padding: 14,
},
reservationTitle: {
color: '#4A3200',
fontSize: 16,
fontWeight: '800',
},
reservationStatus: {
color: '#6A4C00',
fontSize: 15,
fontWeight: '800',
},
reservationRow: {
color: '#5A4A2D',
fontSize: 14,
lineHeight: 20,
},
holdCountdown: {
color: '#7A3E00',
fontSize: 14,
fontWeight: '800',
},
reservationNotice: {
color: '#6A4C00',
fontSize: 13,
fontWeight: '700',
lineHeight: 19,
},
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
inlineButton: {
alignSelf: 'flex-start',
marginTop: 4,
paddingVertical: 6,
},
inlineButtonText: {
color: '#7427D5',
fontSize: 14,
fontWeight: '700',
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
actionButtonDisabled: {
opacity: 0.55,
},
proposalActions: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
marginTop: 8,
},
proposalAcceptButton: {
backgroundColor: '#E1F4E8',
borderRadius: 8,
paddingHorizontal: 10,
paddingVertical: 8,
},
proposalAcceptButtonText: {
color: '#21643A',
fontSize: 12,
fontWeight: '800',
},
proposalRejectButton: {
backgroundColor: '#FCE3E5',
borderRadius: 8,
paddingHorizontal: 10,
paddingVertical: 8,
},
proposalRejectButtonText: {
color: '#8A2533',
fontSize: 12,
fontWeight: '800',
},
paymentProofNotice: {
backgroundColor: '#FFF0D8',
borderColor: '#F0C98D',
borderRadius: 10,
borderWidth: 1,
gap: 5,
marginTop: 8,
padding: 11,
},
paymentProofNoticeTitle: {
color: '#805110',
fontSize: 14,
fontWeight: '800',
},
paymentProofNoticeText: {
color: '#76592F',
fontSize: 13,
lineHeight: 18,
},
paymentProofButton: {
alignSelf: 'flex-start',
backgroundColor: '#FFFFFF',
borderColor: '#D9A95B',
borderRadius: 8,
borderWidth: 1,
marginTop: 3,
paddingHorizontal: 10,
paddingVertical: 8,
},
paymentProofButtonText: {
color: '#805110',
fontSize: 12,
fontWeight: '800',
},
});
