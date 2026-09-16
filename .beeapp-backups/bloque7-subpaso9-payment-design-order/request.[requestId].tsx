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
CheckCircle2,
ChevronDown,
ChevronUp,
CircleDashed,
Clock3,
FileText,
Hourglass,
Info,
Package,
ReceiptText,
Send,
ShieldAlert,
Wrench,
XCircle,
type LucideIcon,
} from 'lucide-react-native';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import type {
CommercialPaymentMethodPublic,
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
loadCommercialRequestPaymentMethods,
rejectCommercialProposal,
replaceRejectedCommercialPaymentProof,
submitCommercialPaymentProofForRequest,
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

function paymentMethodTypeLabel(value: string): string {
const labels: Record<string, string> = {
nequi: 'Nequi',
daviplata: 'Daviplata',
breb: 'Bre-B',
bank_account: 'Cuenta bancaria',
};

return labels[value] || 'Método de pago';
}

function paymentDetailLabel(
key: string,
paymentMethodType: string,
): string {
const labels: Record<string, string> = {
banco: 'Banco',
dato_de_pago: 'Tipo de dato',
numero_de_cuenta: 'Número de cuenta',
numero_de_documento: 'Número de documento',
numero_o_llave: (
paymentMethodType === 'nequi'
? 'Número Nequi'
: paymentMethodType === 'daviplata'
? 'Número Daviplata'
: paymentMethodType === 'breb'
? 'Llave Bre-B'
: 'Dato de pago'
),
tipo_de_cuenta: 'Tipo de cuenta',
tipo_de_documento: 'Tipo de documento',
titular: 'Titular',
};

return labels[key] || key.replace(/_/g, ' ');
}

function paymentDetailValue(value: unknown): string | null {
if (
value === null
|| value === undefined
|| (typeof value === 'string' && !value.trim())
) {
return null;
}

return String(value).trim();
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


type RequestStatusTone =
| 'neutral'
| 'warning'
| 'info'
| 'action'
| 'success'
| 'error'
| 'dispute';

type RequestStatusVisual = {
detail: string;
icon: LucideIcon;
iconColor?: string;
label: string;
title: string;
tone: RequestStatusTone;
};

const requestStatusToneIconColors: Record<RequestStatusTone, string> = {
neutral: '#5D6471',
warning: '#915D00',
info: '#225EA8',
action: '#6A32B2',
success: '#1D6B45',
error: '#9D2435',
dispute: '#9A3A00',
};

type RequestStatusCardStyleName =
| 'statusVisualCardNeutral'
| 'statusVisualCardWarning'
| 'statusVisualCardInfo'
| 'statusVisualCardAction'
| 'statusVisualCardSuccess'
| 'statusVisualCardError'
| 'statusVisualCardDispute';

type RequestStatusIconStyleName =
| 'statusVisualIconNeutral'
| 'statusVisualIconWarning'
| 'statusVisualIconInfo'
| 'statusVisualIconAction'
| 'statusVisualIconSuccess'
| 'statusVisualIconError'
| 'statusVisualIconDispute';

type RequestStatusLabelStyleName =
| 'statusVisualLabelNeutral'
| 'statusVisualLabelWarning'
| 'statusVisualLabelInfo'
| 'statusVisualLabelAction'
| 'statusVisualLabelSuccess'
| 'statusVisualLabelError'
| 'statusVisualLabelDispute';

type RequestStatusTitleStyleName =
| 'statusVisualTitleNeutral'
| 'statusVisualTitleWarning'
| 'statusVisualTitleInfo'
| 'statusVisualTitleAction'
| 'statusVisualTitleSuccess'
| 'statusVisualTitleError'
| 'statusVisualTitleDispute';

type RequestStatusDetailStyleName =
| 'statusVisualDetailNeutral'
| 'statusVisualDetailWarning'
| 'statusVisualDetailInfo'
| 'statusVisualDetailAction'
| 'statusVisualDetailSuccess'
| 'statusVisualDetailError'
| 'statusVisualDetailDispute';

const requestStatusToneStyleNames: Record<
RequestStatusTone,
{
card: RequestStatusCardStyleName;
detail: RequestStatusDetailStyleName;
icon: RequestStatusIconStyleName;
label: RequestStatusLabelStyleName;
title: RequestStatusTitleStyleName;
}
> = {
neutral: {
card: 'statusVisualCardNeutral',
detail: 'statusVisualDetailNeutral',
icon: 'statusVisualIconNeutral',
label: 'statusVisualLabelNeutral',
title: 'statusVisualTitleNeutral',
},
warning: {
card: 'statusVisualCardWarning',
detail: 'statusVisualDetailWarning',
icon: 'statusVisualIconWarning',
label: 'statusVisualLabelWarning',
title: 'statusVisualTitleWarning',
},
info: {
card: 'statusVisualCardInfo',
detail: 'statusVisualDetailInfo',
icon: 'statusVisualIconInfo',
label: 'statusVisualLabelInfo',
title: 'statusVisualTitleInfo',
},
action: {
card: 'statusVisualCardAction',
detail: 'statusVisualDetailAction',
icon: 'statusVisualIconAction',
label: 'statusVisualLabelAction',
title: 'statusVisualTitleAction',
},
success: {
card: 'statusVisualCardSuccess',
detail: 'statusVisualDetailSuccess',
icon: 'statusVisualIconSuccess',
label: 'statusVisualLabelSuccess',
title: 'statusVisualTitleSuccess',
},
error: {
card: 'statusVisualCardError',
detail: 'statusVisualDetailError',
icon: 'statusVisualIconError',
label: 'statusVisualLabelError',
title: 'statusVisualTitleError',
},
dispute: {
card: 'statusVisualCardDispute',
detail: 'statusVisualDetailDispute',
icon: 'statusVisualIconDispute',
label: 'statusVisualLabelDispute',
title: 'statusVisualTitleDispute',
},
};

function getRequestStatusVisual(
status: string,
): RequestStatusVisual {
const visuals: Record<string, RequestStatusVisual> = {
draft: {
detail: 'Aún no has enviado esta solicitud al comercio.',
icon: FileText,
label: 'Borrador',
title: 'Solicitud pendiente de envío',
tone: 'neutral',
},
submitted: {
detail: (
'Tu solicitud fue enviada. El comercio debe revisarla '
+ 'y responder para continuar.'
),
icon: Send,
label: 'Esperando al comercio',
title: 'Esperando respuesta del comercio',
tone: 'warning',
},
under_review: {
detail: (
'El comercio recibió tu solicitud y está revisando '
+ 'los detalles para responderte.'
),
icon: Hourglass,
label: 'En revisión',
title: 'El comercio está revisando tu solicitud',
tone: 'info',
},
proposal_sent: {
detail: (
'El comercio envió una propuesta. Revisa las condiciones '
+ 'y acepta o rechaza para continuar.'
),
icon: ReceiptText,
label: 'Acción requerida',
title: 'Tienes una propuesta para revisar',
tone: 'action',
},
accepted: {
detail: (
'Las condiciones fueron aceptadas. Revisa los siguientes '
+ 'pasos de la solicitud.'
),
icon: CheckCircle2,
label: 'Aceptada',
title: 'Condiciones aceptadas',
tone: 'success',
},
payment_pending: {
detail: (
'Debes completar el pago o seguir las instrucciones '
+ 'indicadas para que la solicitud pueda avanzar.'
),
icon: Clock3,
label: 'Acción requerida',
title: 'Pago pendiente',
tone: 'warning',
},
payment_submitted: {
detail: (
'Tu comprobante fue enviado. El comercio debe validarlo '
+ 'antes de confirmar la solicitud.'
),
icon: Hourglass,
label: 'Validación en curso',
title: 'El comercio está validando tu pago',
tone: 'info',
},
confirmed: {
detail: (
'El comercio confirmó la solicitud. Conserva este detalle '
+ 'para consultar las condiciones acordadas.'
),
icon: CheckCircle2,
label: 'Confirmada',
title: 'Tu solicitud está confirmada',
tone: 'success',
},
completed: {
detail: 'El proceso comercial de esta solicitud finalizó correctamente.',
icon: CheckCircle2,
label: 'Finalizada',
title: 'Solicitud completada',
tone: 'success',
},
rejected: {
detail: (
'El comercio no puede atender esta solicitud. Consulta el historial '
+ 'si dejó una razón o detalle adicional.'
),
icon: XCircle,
label: 'No disponible',
title: 'Solicitud rechazada',
tone: 'error',
},
cancelled: {
detail: (
'Esta solicitud fue cancelada y no continuará. '
+ 'Consulta el historial para ver los detalles disponibles.'
),
icon: CircleDashed,
label: 'Cancelada',
title: 'Solicitud cancelada',
tone: 'neutral',
},
expired: {
detail: (
'El plazo de esta solicitud o de sus condiciones terminó. '
+ 'Podrás crear una nueva solicitud si aún lo necesitas.'
),
icon: Clock3,
label: 'Plazo finalizado',
title: 'Solicitud vencida',
tone: 'neutral',
},
disputed: {
detail: (
'Esta solicitud tiene una disputa abierta. La información '
+ 'se conservará mientras se revisa el caso.'
),
icon: ShieldAlert,
label: 'Requiere revisión',
title: 'Solicitud en disputa',
tone: 'dispute',
},
};

const visual = visuals[status] || {
detail: 'El estado de esta solicitud fue actualizado.',
icon: Info,
label: 'Actualización',
title: statusLabel(status),
tone: 'info' as const,
};

return {
...visual,
iconColor: requestStatusToneIconColors[visual.tone],
};
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
const [expandedPaymentMethodId, setExpandedPaymentMethodId] = useState<
string | null
>(null);
const [requestPaymentMethods, setRequestPaymentMethods] = useState<
CommercialPaymentMethodPublic[] | null
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

try {
const paymentMethodsResponse = await loadCommercialRequestPaymentMethods(
requestId,
);
setRequestPaymentMethods(paymentMethodsResponse.payment_methods);
} catch {
setRequestPaymentMethods(null);
}
} catch (loadError) {
setError(toCommercialUiError(loadError));
setRequestDetail(null);
setFormalContext(null);
setTimeline(null);
setTimelineError(null);
setRequestPaymentMethods(null);
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

const togglePaymentMethodDetails = useCallback((paymentMethodId: string) => {
setExpandedPaymentMethodId((currentId) => (
currentId === paymentMethodId ? null : paymentMethodId
));
}, []);

const handleSubmitPaymentProof = useCallback(async () => {
if (
pendingAction !== null
|| !requestId
|| !formalContext?.permissions.can_submit_payment_proof
) {
return;
}

let selectedProofUri: string | null = null;

try {
const result = await DocumentPicker.getDocumentAsync({
type: 'application/pdf',
copyToCacheDirectory: true,
multiple: false,
});

if (result.canceled || !result.assets[0]) {
return;
}

const asset = result.assets[0];
selectedProofUri = asset.uri;

setPendingAction('submit-proof');
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
name: asset.name || 'comprobante.pdf',
mimeType: asset.mimeType || 'application/pdf',
sizeBytes: asset.size ?? null,
},
);

await submitCommercialPaymentProofForRequest(
requestId,
{
file_id: uploadedFile.id,
},
);

Alert.alert(
'Comprobante enviado',
'Tu comprobante fue enviado para revisión del comercio.',
);
await loadRequest();
} catch (submitError) {
setActionError(toCommercialUiError(submitError));
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
formalContext,
loadRequest,
pendingAction,
requestId,
]);

const handleReplacePaymentProof = useCallback(async (
paymentProofId: string,
) => {
if (
pendingAction !== null
|| !formalContext?.permissions.can_replace_payment_proof
) {
return;
}

let selectedProofUri: string | null = null;

try {
const result = await DocumentPicker.getDocumentAsync({
type: 'application/pdf',
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
name: asset.name || 'comprobante.pdf',
mimeType: asset.mimeType || 'application/pdf',
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
formalContext,
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
const paymentMethods = requestPaymentMethods
?? formalContext?.payment_options?.manual_payment_methods
?? [];

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

{(() => {
const statusVisual = getRequestStatusVisual(
requestDetail.status,
);
const StatusIcon = statusVisual.icon;
const toneStyles = requestStatusToneStyleNames[statusVisual.tone];

return (
<View
accessibilityLabel={
`${statusVisual.title}. ${statusVisual.detail}`
}
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={[
styles.statusVisualCard,
styles[toneStyles.card],
]}
>
<View style={styles.statusVisualHeader}>
<View
style={[
styles.statusVisualIcon,
styles[toneStyles.icon],
]}
>
<StatusIcon color={statusVisual.iconColor} size={22} />
</View>
<View style={styles.statusVisualContent}>
<Text
style={[
styles.statusVisualLabel,
styles[toneStyles.label],
]}
>
{statusVisual.label}
</Text>
<Text
style={[
styles.statusVisualTitle,
styles[toneStyles.title],
]}
>
{statusVisual.title}
</Text>
</View>
</View>
<Text
style={[
styles.statusVisualDetail,
styles[toneStyles.detail],
]}
>
{statusVisual.detail}
</Text>
</View>
);
})()}

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

{requestDetail.status === 'payment_pending'
&& formalContext?.permissions.can_submit_payment_proof ? (
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.paymentMethodsCard}
>
<Text style={styles.paymentMethodsTitle}>
Métodos de pago disponibles
</Text>

<Text style={styles.paymentMethodsDescription}>
Puedes pagar por cualquiera de las siguientes opciones. Luego
adjunta el comprobante de pago en formato PDF.
</Text>

{paymentMethods.length ? (
<View style={styles.paymentMethodsList}>
{paymentMethods.map((method) => {
const isPaymentMethodExpanded = expandedPaymentMethodId === method.id;

return (
<View key={method.id} style={styles.paymentMethodCard}>
<TouchableOpacity
accessibilityLabel={`${paymentMethodTypeLabel(method.payment_method_type)}: ${method.display_name}`}
accessibilityRole="button"
accessibilityState={{ expanded: isPaymentMethodExpanded }}
activeOpacity={0.8}
onPress={() => togglePaymentMethodDetails(method.id)}
style={styles.paymentMethodHeader}
>
<View style={styles.paymentMethodHeaderText}>
<Text style={styles.paymentMethodType}>
{paymentMethodTypeLabel(method.payment_method_type)}
</Text>
<Text style={styles.paymentMethodName}>
{method.display_name}
</Text>
</View>
{isPaymentMethodExpanded ? (
<ChevronUp color="#6A3CA0" size={20} />
) : (
<ChevronDown color="#6A3CA0" size={20} />
)}
</TouchableOpacity>

{isPaymentMethodExpanded ? (
<View style={styles.paymentMethodContent}>
{Object.entries(method.public_details || {})
.map(([key, value]) => ({
key,
label: paymentDetailLabel(
key,
method.payment_method_type,
),
value: paymentDetailValue(value),
}))
.filter((detail) => detail.value !== null)
.map((detail, index, details) => (
<View
key={detail.key}
style={[
styles.paymentMethodDetailRow,
index < details.length - 1
? styles.paymentMethodDetailRowSeparated
: null,
]}
>
<Text style={styles.paymentMethodDetailLabel}>
{detail.label}
</Text>
<Text
selectable
style={styles.paymentMethodDetailValue}
>
{detail.value}
</Text>
</View>
))}

{Object.keys(method.public_details || {}).some(
([, value]) => paymentDetailValue(value) !== null,
) ? (
<Text style={styles.paymentMethodDetailsCaption}>
Datos para pagar
</Text>
) : null}

{method.public_instructions ? (
<View style={styles.paymentMethodInstructionsBox}>
<Info color="#6A3CA0" size={16} />
<Text style={styles.paymentMethodInstructions}>
{method.public_instructions}
</Text>
</View>
) : null}
</View>
) : null}
</View>
);
})}
</View>
) : (
<Text style={styles.paymentMethodsUnavailable}>
El comercio aún no tiene métodos de pago disponibles.
</Text>
)}

<TouchableOpacity
accessibilityLabel="Subir comprobante de pago en PDF"
accessibilityRole="button"
accessibilityState={{
busy: pendingAction === 'submit-proof',
disabled: pendingAction !== null,
}}
activeOpacity={0.85}
disabled={pendingAction !== null}
onPress={() => {
void handleSubmitPaymentProof();
}}
style={[
styles.paymentProofSubmitButton,
pendingAction !== null
? styles.actionButtonDisabled
: null,
]}
>
<FileText color="#FFFFFF" size={18} />
<Text style={styles.paymentProofSubmitButtonText}>
{pendingAction === 'submit-proof'
? 'Enviando comprobante...'
: 'Subir comprobante de pago'}
</Text>
</TouchableOpacity>
</View>
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

return (
latestRejectedPaymentProofEvent
&& formalContext?.permissions.can_replace_payment_proof
) ? (
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.paymentProofNotice}
>
<Text style={styles.paymentProofNoticeTitle}>
Comprobante rechazado
</Text>
<Text style={styles.paymentProofNoticeText}>
Adjunta un comprobante corregido en formato PDF para enviarlo nuevamente.
</Text>
<TouchableOpacity
accessibilityLabel="Subir comprobante corregido en PDF"
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
: 'Subir comprobante corregido'}
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
statusVisualCard: {
borderRadius: 16,
borderWidth: 1,
gap: 12,
padding: 16,
},
statusVisualCardNeutral: {
backgroundColor: '#F1F3F6',
borderColor: '#D8DDE5',
},
statusVisualCardWarning: {
backgroundColor: '#FFF5D9',
borderColor: '#F0CF7A',
},
statusVisualCardInfo: {
backgroundColor: '#EAF4FF',
borderColor: '#B6D7F7',
},
statusVisualCardAction: {
backgroundColor: '#F1E9FF',
borderColor: '#D5BAF7',
},
statusVisualCardSuccess: {
backgroundColor: '#E6F6EC',
borderColor: '#B5E1C4',
},
statusVisualCardError: {
backgroundColor: '#FDE9EB',
borderColor: '#F0BEC5',
},
statusVisualCardDispute: {
backgroundColor: '#FFF0E2',
borderColor: '#F3BD88',
},
statusVisualHeader: {
alignItems: 'center',
flexDirection: 'row',
gap: 12,
},
statusVisualIcon: {
alignItems: 'center',
borderRadius: 22,
height: 44,
justifyContent: 'center',
width: 44,
},
statusVisualIconNeutral: {
backgroundColor: '#E0E4EA',
},
statusVisualIconWarning: {
backgroundColor: '#FFE6A8',
},
statusVisualIconInfo: {
backgroundColor: '#D7EAFC',
},
statusVisualIconAction: {
backgroundColor: '#E4D2FF',
},
statusVisualIconSuccess: {
backgroundColor: '#CDEDD8',
},
statusVisualIconError: {
backgroundColor: '#F8D4D9',
},
statusVisualIconDispute: {
backgroundColor: '#FFD4AA',
},
statusVisualContent: {
flex: 1,
},
statusVisualLabel: {
fontSize: 12,
fontWeight: '800',
letterSpacing: 0.2,
textTransform: 'uppercase',
},
statusVisualLabelNeutral: {
color: '#5D6471',
},
statusVisualLabelWarning: {
color: '#915D00',
},
statusVisualLabelInfo: {
color: '#225EA8',
},
statusVisualLabelAction: {
color: '#6A32B2',
},
statusVisualLabelSuccess: {
color: '#1D6B45',
},
statusVisualLabelError: {
color: '#9D2435',
},
statusVisualLabelDispute: {
color: '#9A3A00',
},
statusVisualTitle: {
fontSize: 18,
fontWeight: '800',
lineHeight: 24,
marginTop: 3,
},
statusVisualTitleNeutral: {
color: '#36404E',
},
statusVisualTitleWarning: {
color: '#684400',
},
statusVisualTitleInfo: {
color: '#1A4C87',
},
statusVisualTitleAction: {
color: '#542596',
},
statusVisualTitleSuccess: {
color: '#175A39',
},
statusVisualTitleError: {
color: '#7D1D2B',
},
statusVisualTitleDispute: {
color: '#783000',
},
statusVisualDetail: {
fontSize: 13,
lineHeight: 20,
},
statusVisualDetailNeutral: {
color: '#56606E',
},
statusVisualDetailWarning: {
color: '#76520C',
},
statusVisualDetailInfo: {
color: '#315D8F',
},
statusVisualDetailAction: {
color: '#62488A',
},
statusVisualDetailSuccess: {
color: '#346749',
},
statusVisualDetailError: {
color: '#7E3A44',
},
statusVisualDetailDispute: {
color: '#7A4B22',
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
paymentMethodsCard: {
backgroundColor: '#F4EDFF',
borderColor: '#CDB7EE',
borderRadius: 14,
borderWidth: 1,
gap: 9,
marginTop: 8,
padding: 14,
},
paymentMethodsTitle: {
color: '#43206F',
fontSize: 16,
fontWeight: '900',
},
paymentMethodsDescription: {
color: '#614A81',
fontSize: 13,
lineHeight: 19,
},
paymentMethodsList: {
gap: 8,
},
paymentMethodCard: {
backgroundColor: '#FFFFFF',
borderColor: '#E4D8F4',
borderRadius: 10,
borderWidth: 1,
gap: 4,
padding: 11,
},
paymentMethodHeader: {
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'space-between',
},
paymentMethodHeaderText: {
flex: 1,
paddingRight: 10,
},
paymentMethodType: {
color: '#7A6696',
fontSize: 12,
fontWeight: '700',
marginBottom: 2,
},
paymentMethodName: {
color: '#3A245B',
fontSize: 14,
fontWeight: '800',
},
paymentMethodContent: {
borderTopColor: '#EEE5F8',
borderTopWidth: 1,
gap: 8,
marginTop: 7,
paddingTop: 9,
},
paymentMethodDetailsCaption: {
color: '#80679F',
fontSize: 10,
fontWeight: '900',
letterSpacing: 0.8,
order: -1,
textTransform: 'uppercase',
},
paymentMethodDetailRow: {
gap: 2,
paddingVertical: 3,
},
paymentMethodDetailRowSeparated: {
borderBottomColor: '#F1EBF8',
borderBottomWidth: 1,
paddingBottom: 8,
},
paymentMethodDetailLabel: {
color: '#80679F',
fontSize: 11,
fontWeight: '800',
letterSpacing: 0.2,
},
paymentMethodDetailValue: {
color: '#3A245B',
fontSize: 14,
fontWeight: '800',
lineHeight: 20,
},
paymentMethodInstructionsBox: {
alignItems: 'flex-start',
backgroundColor: '#F7F2FC',
borderRadius: 8,
flexDirection: 'row',
gap: 7,
marginTop: 2,
padding: 9,
},
paymentMethodInstructions: {
color: '#4B3566',
flex: 1,
fontSize: 13,
lineHeight: 19,
},
paymentMethodsUnavailable: {
color: '#8A2533',
fontSize: 13,
lineHeight: 19,
},
paymentProofSubmitButton: {
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 11,
flexDirection: 'row',
justifyContent: 'center',
marginTop: 4,
minHeight: 48,
paddingHorizontal: 16,
},
paymentProofSubmitButtonText: {
color: '#FFFFFF',
fontSize: 14,
fontWeight: '900',
marginLeft: 8,
},
});
