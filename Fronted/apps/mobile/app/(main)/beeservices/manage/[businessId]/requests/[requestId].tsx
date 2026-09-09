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
TextInput,
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
CommercialRequestDetailContext,
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
presentCommercialReservation,
} from '../../../../../../src/features/buddyservices/commercialReservationPresentation';
import {
toCommercialReservationStartsAtIso,
} from '../../../../../../src/features/buddyservices/commercialReservationDateTime';
import {
completeOwnedCommercialRequest,
createCommercialProposal,
createCommercialReservationHoldForRequest,
loadCommercialRequestFormalDetail,
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
const [formalContext, setFormalContext] = useState<
CommercialRequestDetailContext | null
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
const [holdLocalDate, setHoldLocalDate] = useState('');
const [holdLocalTime, setHoldLocalTime] = useState('');
const [holdTimezone, setHoldTimezone] = useState('');
const [proposalSubtotal, setProposalSubtotal] = useState('');
const [proposalDeliveryFee, setProposalDeliveryFee] = useState('');
const [proposalLocalDate, setProposalLocalDate] = useState('');
const [proposalLocalStartTime, setProposalLocalStartTime] = useState('');
const [proposalLocalEndTime, setProposalLocalEndTime] = useState('');
const [proposalTimezone, setProposalTimezone] = useState('');
const [proposalNote, setProposalNote] = useState('');
const [proposalTerms, setProposalTerms] = useState('');

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
const response = await loadCommercialRequestFormalDetail(
requestId,
);

if (
response.request.commercial_profile_id
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
setFormalContext(null);
setTimeline(null);
return;
}

setRequestDetail(response.request);
setFormalContext(response.context);
setTimeline(response.context.timeline);
setHoldTimezone((currentTimezone) => (
currentTimezone.trim()
|| response.context.business.timezone
|| response.context.reservation?.timezone
|| 'America/Bogota'
));
setProposalTimezone((currentTimezone) => (
currentTimezone.trim()
|| response.context.business.timezone
|| response.context.reservation?.timezone
|| 'America/Bogota'
));
setProposalSubtotal((currentValue) => (
currentValue.trim()
|| (
response.request.subtotal_amount === null
? ''
: String(response.request.subtotal_amount)
)
));
setProposalDeliveryFee((currentValue) => (
currentValue.trim()
|| (
response.request.delivery_fee_amount === null
? ''
: String(response.request.delivery_fee_amount)
)
));
} catch (loadError) {
setError(toCommercialUiError(loadError));
setRequestDetail(null);
setFormalContext(null);
setTimeline(null);
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

const parseProposalAmount = (
value: string,
fieldLabel: string,
): number | null => {
const normalizedValue = value.trim();

if (!normalizedValue) {
return null;
}

const parsedAmount = Number(normalizedValue);

if (
!Number.isFinite(parsedAmount)
|| parsedAmount < 0
|| !Number.isInteger(parsedAmount)
) {
throw new Error(
`${fieldLabel} debe ser un número entero igual o mayor que cero.`,
);
}

return parsedAmount;
};

const proposalTotalPreview = (() => {
try {
const subtotal = parseProposalAmount(
proposalSubtotal,
'El subtotal',
);
const deliveryFee = parseProposalAmount(
proposalDeliveryFee,
'El valor de domicilio',
);

return (
subtotal === null && deliveryFee === null
? null
: (subtotal || 0) + (deliveryFee || 0)
);
} catch {
return null;
}
})();

const hasProposalContent = Boolean(
proposalSubtotal.trim()
|| proposalDeliveryFee.trim()
|| proposalLocalDate.trim()
|| proposalLocalStartTime.trim()
|| proposalLocalEndTime.trim()
|| proposalNote.trim()
|| proposalTerms.trim()
);

const handleCreateProposal = useCallback(() => {
if (
!formalContext?.permissions.can_create_proposal
|| !requestDetail
) {
return;
}

if (!hasProposalContent) {
setActionError({
title: 'Completa la propuesta',
message: (
'Agrega un monto, un horario completo, una nota o '
+ 'condiciones antes de enviarla.'
),
retryable: false,
});
return;
}

const requestedModality = requestDetail.requested_modality;

void runAction(
'create-proposal',
async () => {
const subtotalAmount = parseProposalAmount(
proposalSubtotal,
'El subtotal',
);
const deliveryFeeAmount = parseProposalAmount(
proposalDeliveryFee,
'El valor de domicilio',
);
const hasScheduleValue = Boolean(
proposalLocalDate.trim()
|| proposalLocalStartTime.trim()
|| proposalLocalEndTime.trim()
);

let proposedStartsAt: string | null = null;
let proposedEndsAt: string | null = null;

if (hasScheduleValue) {
if (
!proposalLocalDate.trim()
|| !proposalLocalStartTime.trim()
|| !proposalLocalEndTime.trim()
) {
throw new Error(
'Completa fecha, hora de inicio y hora de fin para proponer un horario.',
);
}

proposedStartsAt = toCommercialReservationStartsAtIso({
localDate: proposalLocalDate,
localTime: proposalLocalStartTime,
timezone: proposalTimezone,
});
proposedEndsAt = toCommercialReservationStartsAtIso({
localDate: proposalLocalDate,
localTime: proposalLocalEndTime,
timezone: proposalTimezone,
});

if (
new Date(proposedEndsAt).getTime()
<= new Date(proposedStartsAt).getTime()
) {
throw new Error(
'La hora de fin debe ser posterior a la hora de inicio.',
);
}
}

return createCommercialProposal(
requestId,
{
delivery_fee_amount: deliveryFeeAmount,
note: proposalNote.trim() || null,
proposed_ends_at: proposedEndsAt,
proposed_starts_at: proposedStartsAt,
requested_modality: requestedModality,
subtotal_amount: subtotalAmount,
terms_snapshot: proposalTerms.trim()
? { general: proposalTerms.trim() }
: {},
timezone: hasScheduleValue
? proposalTimezone.trim()
: null,
total_amount: (
subtotalAmount === null && deliveryFeeAmount === null
? null
: (subtotalAmount || 0) + (deliveryFeeAmount || 0)
),
},
);
},
'La propuesta fue enviada al cliente para su revisión.',
);
}, [
formalContext?.permissions.can_create_proposal,
hasProposalContent,
proposalDeliveryFee,
proposalLocalDate,
proposalLocalEndTime,
proposalLocalStartTime,
proposalNote,
proposalSubtotal,
proposalTerms,
proposalTimezone,
requestDetail,
requestId,
runAction,
]);

const handleCreateReservationHold = useCallback(() => {
if (!formalContext?.permissions.can_create_reservation_hold) {
return;
}

void runAction(
'create-hold',
async () => {
const startsAt = toCommercialReservationStartsAtIso({
localDate: holdLocalDate,
localTime: holdLocalTime,
timezone: holdTimezone,
});

return createCommercialReservationHoldForRequest(
requestId,
{
starts_at: startsAt,
timezone: holdTimezone.trim(),
},
);
},
'El hold temporal fue creado. Su vencimiento se muestra en la reserva.',
);
}, [
formalContext?.permissions.can_create_reservation_hold,
holdLocalDate,
holdLocalTime,
holdTimezone,
requestId,
runAction,
]);

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

{formalContext?.reservation ? (() => {
const reservationPresentation = presentCommercialReservation(
formalContext.reservation,
);

return (
<View style={styles.reservationCard}>
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

{formalContext?.permissions.can_create_proposal ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Crear propuesta
</Text>
<Text style={styles.row}>
La propuesta no confirma el servicio. El cliente debe revisarla y aceptarla.
</Text>
<Text style={styles.row}>
Modalidad: {modalityLabel(requestDetail.requested_modality)}
</Text>
<TextInput
accessibilityLabel="Subtotal de la propuesta"
keyboardType="numeric"
onChangeText={setProposalSubtotal}
placeholder="Subtotal en COP"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalSubtotal}
/>
<TextInput
accessibilityLabel="Valor de domicilio de la propuesta"
keyboardType="numeric"
onChangeText={setProposalDeliveryFee}
placeholder="Domicilio en COP"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalDeliveryFee}
/>
<Text style={styles.proposalTotalPreview}>
Total propuesto: {formatCop(proposalTotalPreview)}
</Text>
<Text style={styles.inputHint}>
El horario es opcional; si lo propones, completa fecha, inicio y fin.
</Text>
<TextInput
accessibilityLabel="Fecha propuesta"
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={setProposalLocalDate}
placeholder="Fecha: AAAA-MM-DD"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalLocalDate}
/>
<TextInput
accessibilityLabel="Hora de inicio propuesta"
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={setProposalLocalStartTime}
placeholder="Inicio: HH:MM"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalLocalStartTime}
/>
<TextInput
accessibilityLabel="Hora de fin propuesta"
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={setProposalLocalEndTime}
placeholder="Fin: HH:MM"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalLocalEndTime}
/>
<TextInput
accessibilityLabel="Zona horaria de la propuesta"
autoCapitalize="none"
onChangeText={setProposalTimezone}
placeholder="Zona horaria IANA"
placeholderTextColor="#9B90AA"
style={styles.input}
value={proposalTimezone}
/>
<TextInput
accessibilityLabel="Nota de la propuesta"
multiline
onChangeText={setProposalNote}
placeholder="Nota opcional para el cliente"
placeholderTextColor="#9B90AA"
style={[styles.input, styles.multilineInput]}
textAlignVertical="top"
value={proposalNote}
/>
<TextInput
accessibilityLabel="Términos de la propuesta"
multiline
onChangeText={setProposalTerms}
placeholder="Términos o condiciones opcionales"
placeholderTextColor="#9B90AA"
style={[styles.input, styles.multilineInput]}
textAlignVertical="top"
value={proposalTerms}
/>
<TouchableOpacity
accessibilityLabel="Enviar propuesta al cliente"
accessibilityRole="button"
disabled={
pendingAction !== null
|| !hasProposalContent
}
onPress={handleCreateProposal}
style={[
styles.proposalButton,
pendingAction !== null
|| !hasProposalContent
? styles.disabledButton
: null,
]}
>
<Text style={styles.proposalButtonText}>
{pendingAction === 'create-proposal'
? 'Enviando propuesta...'
: 'Enviar propuesta'}
</Text>
</TouchableOpacity>
</View>
) : null}

{formalContext?.permissions.can_create_reservation_hold ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Crear hold temporal
</Text>
<Text style={styles.row}>
Retiene una fecha de forma temporal. No confirma la reserva ni el servicio.
</Text>
<TextInput
accessibilityLabel="Fecha de inicio del hold"
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={setHoldLocalDate}
placeholder="Fecha: AAAA-MM-DD"
placeholderTextColor="#9B90AA"
style={styles.input}
value={holdLocalDate}
/>
<TextInput
accessibilityLabel="Hora de inicio del hold"
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={setHoldLocalTime}
placeholder="Hora: HH:MM"
placeholderTextColor="#9B90AA"
style={styles.input}
value={holdLocalTime}
/>
<TextInput
accessibilityLabel="Zona horaria del hold"
autoCapitalize="none"
onChangeText={setHoldTimezone}
placeholder="Zona horaria IANA"
placeholderTextColor="#9B90AA"
style={styles.input}
value={holdTimezone}
/>
<TouchableOpacity
accessibilityLabel="Crear hold temporal"
accessibilityRole="button"
disabled={
pendingAction !== null
|| !holdLocalDate.trim()
|| !holdLocalTime.trim()
|| !holdTimezone.trim()
}
onPress={handleCreateReservationHold}
style={[
styles.holdButton,
pendingAction !== null
|| !holdLocalDate.trim()
|| !holdLocalTime.trim()
|| !holdTimezone.trim()
? styles.disabledButton
: null,
]}
>
<Text style={styles.holdButtonText}>
{pendingAction === 'create-hold'
? 'Creando hold...'
: 'Crear hold temporal'}
</Text>
</TouchableOpacity>
</View>
) : null}

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

{formalContext?.permissions.can_complete ? (
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
{proposal.status === 'pending'
&& formalContext?.permissions.can_withdraw_proposal ? (
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
input: {
borderColor: '#DDD5E8',
borderRadius: 10,
borderWidth: 1,
color: '#38294E',
fontSize: 15,
paddingHorizontal: 12,
paddingVertical: 11,
},
holdButton: {
alignItems: 'center',
backgroundColor: '#A25800',
borderRadius: 10,
justifyContent: 'center',
minHeight: 46,
paddingHorizontal: 16,
},
holdButtonText: {
color: '#FFFFFF',
fontSize: 15,
fontWeight: '800',
},
proposalButton: {
alignItems: 'center',
backgroundColor: '#5420A5',
borderRadius: 10,
justifyContent: 'center',
minHeight: 46,
paddingHorizontal: 16,
},
proposalButtonText: {
color: '#FFFFFF',
fontSize: 15,
fontWeight: '800',
},
proposalTotalPreview: {
color: '#5420A5',
fontSize: 15,
fontWeight: '800',
},
inputHint: {
color: '#806899',
fontSize: 13,
lineHeight: 19,
},
multilineInput: {
minHeight: 88,
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
