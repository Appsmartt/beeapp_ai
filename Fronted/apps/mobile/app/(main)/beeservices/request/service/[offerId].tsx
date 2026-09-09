import {
useCallback,
useEffect,
useMemo,
useRef,
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
CheckCircle2,
Wrench,
} from 'lucide-react-native';
import {
ApiRequestError,
} from '@beeapp/api-client';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';

import type {
CommercialModality,
CommercialPublicOffer,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
type CommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
createCommercialRequestIdempotencyKey,
} from '../../../../../src/features/buddyservices/cart/businessCartRequestPayload';
import {
buddyServicesRequestDetailRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';

import {
canSubmitServiceRequest,
getServiceRequestPriceHint,
getServiceRequestPriceLabel,
isNonBookableServiceOffer,
shouldRefreshServiceOfferAfterError,
} from '../../../../../src/features/buddyservices/serviceRequestFlow';
import {
createServiceRequest,
loadPublicCommercialOffer,
} from '../../../../../src/services/commercialService';

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
return 'Por confirmar';
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

function modalityLabel(
modality: CommercialModality,
): string {
const labels: Record<CommercialModality, string> = {
at_establishment: 'En establecimiento',
in_person: 'Presencial',
virtual: 'Virtual',
home_visit: 'Visita a domicilio',
delivery: 'Entrega a domicilio',
pickup: 'Recoger en negocio',
phone_call: 'Llamada telefónica',
buddy_chat: 'Chat Buddy',
};

return labels[modality];
}

export default function BuddyServicesServiceRequestScreen() {
const router = useRouter();
const params = useLocalSearchParams<{
offerId?: string | string[];
}>();

const offerId = normalizeParam(params.offerId);

const [offer, setOffer] = useState<CommercialPublicOffer | null>(
null,
);
const [requestedModality, setRequestedModality] = useState<
CommercialModality | null
>(null);
const [customerNote, setCustomerNote] = useState('');
const [deliveryAddress, setDeliveryAddress] = useState('');
const [deliveryReference, setDeliveryReference] = useState('');
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<CommercialUiError | null>(
null,
);
const submissionIdempotencyKeyRef = useRef<string | null>(null);

const invalidateSubmissionIdempotencyKey = useCallback(() => {
submissionIdempotencyKeyRef.current = null;
}, []);

const canSubmit = useMemo(() => (
canSubmitServiceRequest({
offer,
requestedModality,
deliveryAddress,
submitting,
})
), [
deliveryAddress,
offer,
requestedModality,
submitting,
]);

const loadOffer = useCallback(async () => {
if (!offerId) {
setLoading(false);
setError({
title: 'Servicio no identificado',
message: (
'No fue posible identificar el servicio que deseas solicitar.'
),
retryable: false,
});
return;
}

setLoading(true);
setError(null);

try {
const response = await loadPublicCommercialOffer(offerId);
const nextOffer = response.offer;

if (!isNonBookableServiceOffer(nextOffer)) {
submissionIdempotencyKeyRef.current = null;
setOffer(null);
setRequestedModality(null);
setError({
title: 'Solicitud no disponible',
message: (
'Este flujo solo está disponible para servicios '
+ 'que no requieren reserva.'
),
retryable: false,
});
return;
}

submissionIdempotencyKeyRef.current = null;
setOffer(nextOffer);
setRequestedModality((currentModality) => (
currentModality
&& nextOffer.modalities.includes(currentModality)
? currentModality
: nextOffer.modalities[0] || null
));
} catch (loadError) {
setError(toCommercialUiError(loadError));
} finally {
setLoading(false);
}
}, [offerId]);

useEffect(() => {
void loadOffer();
}, [loadOffer]);

const handleRefresh = useCallback(async () => {
setRefreshing(true);

try {
await loadOffer();
} finally {
setRefreshing(false);
}
}, [loadOffer]);

const handleBack = useCallback(() => {
if (router.canGoBack()) {
router.back();
return;
}

router.replace('/(main)/beeservices');
}, [router]);

const handleSubmit = useCallback(async () => {
if (!offer || !requestedModality || submitting) {
return;
}

if (
requestedModality === 'delivery'
&& !deliveryAddress.trim()
) {
Alert.alert(
'Dirección requerida',
'Ingresa la dirección para la entrega a domicilio.',
);
return;
}

const idempotencyKey = (
submissionIdempotencyKeyRef.current
|| createCommercialRequestIdempotencyKey()
);

submissionIdempotencyKeyRef.current = idempotencyKey;
setSubmitting(true);

try {
const response = await createServiceRequest(
{
commercialOfferId: offer.id,
commercialProfileId: offer.commercial_profile_id,
requestedModality,
customerNote,
deliveryAddress,
deliveryReference,
},
idempotencyKey,
);

submissionIdempotencyKeyRef.current = null;

router.replace(
buddyServicesRequestDetailRoute(
response.request.request_id,
),
);
} catch (submitError) {
const uiError = toCommercialUiError(submitError);
const shouldRefreshOffer = (
submitError instanceof ApiRequestError
&& shouldRefreshServiceOfferAfterError(submitError.status)
);

if (shouldRefreshOffer) {
try {
await loadOffer();

Alert.alert(
'Información actualizada',
(
`${uiError.message} `
+ 'Revisa el servicio y la modalidad antes de reenviar '
+ 'la solicitud.'
),
);
} catch {
Alert.alert(uiError.title, uiError.message);
}
} else {
Alert.alert(uiError.title, uiError.message);
}
} finally {
setSubmitting(false);
}
}, [
customerNote,
deliveryAddress,
deliveryReference,
invalidateSubmissionIdempotencyKey,
loadOffer,
offer,
requestedModality,
router,
submitting,
]);

if (loading && !offer) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centerState}>
<ActivityIndicator color="#7427D5" size="small" />
<Text style={styles.stateText}>
Cargando servicio…
</Text>
</View>
</ScreenSafeArea>
);
}

if (error || !offer) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.centerState}
>
<Text style={styles.errorTitle}>
{error?.title || 'Servicio no disponible'}
</Text>

<Text style={styles.errorText}>
{error?.message || (
'No fue posible cargar el servicio solicitado.'
)}
</Text>

{error?.retryable ? (
<TouchableOpacity
accessibilityLabel="Reintentar carga de servicio"
accessibilityRole="button"
activeOpacity={0.8}
onPress={() => void loadOffer()}
style={styles.primaryButton}
>
<Text style={styles.primaryButtonText}>
Reintentar
</Text>
</TouchableOpacity>
) : null}

<TouchableOpacity
accessibilityLabel="Volver"
accessibilityRole="button"
activeOpacity={0.8}
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
<View style={styles.container}>
<View style={styles.header}>
<TouchableOpacity
accessibilityLabel="Volver"
accessibilityRole="button"
activeOpacity={0.8}
onPress={handleBack}
style={styles.backButton}
>
<ArrowLeft color="#38294E" size={22} />
</TouchableOpacity>

<View style={styles.headerContent}>
<Text style={styles.headerEyebrow}>
Solicitud formal
</Text>
<Text numberOfLines={1} style={styles.headerTitle}>
Solicitar servicio
</Text>
</View>
</View>

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
showsVerticalScrollIndicator={false}
>
<View style={styles.serviceCard}>
<View style={styles.serviceIcon}>
<Wrench color="#7427D5" size={22} />
</View>

<View style={styles.serviceText}>
<Text style={styles.serviceTitle}>
{offer.title}
</Text>

<Text style={styles.servicePrice}>
{getServiceRequestPriceLabel(offer, formatCop)}
</Text>
</View>
</View>

<View style={styles.noticeCard}>
<CheckCircle2 color="#5E2AA9" size={19} />
<Text style={styles.noticeText}>
{getServiceRequestPriceHint(offer)}
</Text>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>
Modalidad de atención
</Text>

{offer.modalities.length ? (
<View style={styles.modalitiesWrap}>
{offer.modalities.map((modality) => {
const selected = modality === requestedModality;

return (
<TouchableOpacity
key={modality}
accessibilityLabel={
`Seleccionar ${modalityLabel(modality)}`
}
accessibilityRole="button"
accessibilityState={{
selected,
}}
activeOpacity={0.8}
onPress={() => {
invalidateSubmissionIdempotencyKey();
setRequestedModality(modality);
}}
style={[
styles.modalityButton,
selected
? styles.modalityButtonSelected
: null,
]}
>
<Text style={[
styles.modalityButtonText,
selected
? styles.modalityButtonTextSelected
: null,
]}>
{modalityLabel(modality)}
</Text>
</TouchableOpacity>
);
})}
</View>
) : (
<Text style={styles.helperText}>
El negocio no tiene modalidades disponibles para este
servicio.
</Text>
)}
</View>

{requestedModality === 'delivery' ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Datos de entrega
</Text>

<TextInput
accessibilityLabel="Dirección de entrega"
onChangeText={(value) => {
invalidateSubmissionIdempotencyKey();
setDeliveryAddress(value);
}}
placeholder="Dirección de entrega"
placeholderTextColor="#9C8BAF"
style={styles.input}
value={deliveryAddress}
/>

<TextInput
accessibilityLabel="Referencia de entrega"
onChangeText={(value) => {
invalidateSubmissionIdempotencyKey();
setDeliveryReference(value);
}}
placeholder="Referencia o indicaciones (opcional)"
placeholderTextColor="#9C8BAF"
style={[styles.input, styles.inputSpacing]}
value={deliveryReference}
/>
</View>
) : null}

<View style={styles.section}>
<Text style={styles.sectionTitle}>
¿Qué necesitas?
</Text>

<TextInput
accessibilityLabel="Necesidad o comentario del servicio"
multiline
onChangeText={(value) => {
invalidateSubmissionIdempotencyKey();
setCustomerNote(value);
}}
placeholder="Describe lo que necesitas para que el negocio revise tu solicitud."
placeholderTextColor="#9C8BAF"
style={styles.noteInput}
textAlignVertical="top"
value={customerNote}
/>

<Text style={styles.helperText}>
Esta solicitud no es un pedido final. El negocio debe
revisarla y aceptar o acordar las condiciones.
</Text>
</View>

<TouchableOpacity
accessibilityLabel={
submitting
? 'Enviando solicitud de servicio'
: 'Enviar solicitud de servicio'
}
accessibilityRole="button"
accessibilityState={{
busy: submitting,
disabled: !canSubmit,
}}
activeOpacity={0.85}
disabled={!canSubmit}
onPress={() => void handleSubmit()}
style={[
styles.submitButton,
!canSubmit
? styles.submitButtonDisabled
: null,
]}
>
<Text style={styles.submitButtonText}>
{submitting
? 'Enviando solicitud...'
: 'Enviar solicitud'}
</Text>
</TouchableOpacity>
</ScrollView>
</View>
</ScreenSafeArea>
);
}

const styles = StyleSheet.create({
safeArea: {
backgroundColor: '#FBF9FE',
flex: 1,
},
container: {
backgroundColor: '#FBF9FE',
flex: 1,
},
header: {
alignItems: 'center',
backgroundColor: '#FFFFFF',
borderBottomColor: '#F0EAF3',
borderBottomWidth: 1,
flexDirection: 'row',
minHeight: 68,
paddingHorizontal: 16,
},
backButton: {
alignItems: 'center',
height: 42,
justifyContent: 'center',
width: 42,
},
headerContent: {
flex: 1,
marginLeft: 8,
},
headerEyebrow: {
color: '#7427D5',
fontSize: 11,
fontWeight: '800',
letterSpacing: 0.6,
textTransform: 'uppercase',
},
headerTitle: {
color: '#38294E',
fontSize: 18,
fontWeight: '800',
marginTop: 2,
},
content: {
padding: 16,
paddingBottom: 36,
},
centerState: {
alignItems: 'center',
flex: 1,
justifyContent: 'center',
padding: 28,
},
stateText: {
color: '#6E6281',
fontSize: 15,
marginTop: 12,
},
errorTitle: {
color: '#38294E',
fontSize: 20,
fontWeight: '800',
textAlign: 'center',
},
errorText: {
color: '#6E6281',
fontSize: 15,
lineHeight: 22,
marginTop: 8,
textAlign: 'center',
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
marginTop: 12,
padding: 12,
},
secondaryButtonText: {
color: '#7427D5',
fontSize: 15,
fontWeight: '700',
},
serviceCard: {
alignItems: 'center',
backgroundColor: '#FFFFFF',
borderColor: '#EEE7F3',
borderRadius: 17,
borderWidth: 1,
flexDirection: 'row',
padding: 15,
},
serviceIcon: {
alignItems: 'center',
backgroundColor: '#F3E8FE',
borderRadius: 13,
height: 46,
justifyContent: 'center',
width: 46,
},
serviceText: {
flex: 1,
marginLeft: 12,
},
serviceTitle: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
lineHeight: 21,
},
servicePrice: {
color: '#6527AA',
fontSize: 14,
fontWeight: '800',
marginTop: 5,
},
noticeCard: {
alignItems: 'flex-start',
backgroundColor: '#F4EAFE',
borderColor: '#E2D0F5',
borderRadius: 14,
borderWidth: 1,
flexDirection: 'row',
marginTop: 14,
padding: 13,
},
noticeText: {
color: '#5B397D',
flex: 1,
fontSize: 13,
lineHeight: 19,
marginLeft: 9,
},
section: {
marginTop: 22,
},
sectionTitle: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
marginBottom: 10,
},
modalitiesWrap: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
},
modalityButton: {
backgroundColor: '#FFFFFF',
borderColor: '#DCCBEF',
borderRadius: 18,
borderWidth: 1,
paddingHorizontal: 12,
paddingVertical: 9,
},
modalityButtonSelected: {
backgroundColor: '#7427D5',
borderColor: '#7427D5',
},
modalityButtonText: {
color: '#623D8B',
fontSize: 12,
fontWeight: '700',
},
modalityButtonTextSelected: {
color: '#FFFFFF',
},
input: {
backgroundColor: '#FFFFFF',
borderColor: '#E7DDF0',
borderRadius: 12,
borderWidth: 1,
color: '#38294E',
fontSize: 14,
minHeight: 49,
paddingHorizontal: 13,
},
inputSpacing: {
marginTop: 10,
},
noteInput: {
backgroundColor: '#FFFFFF',
borderColor: '#E7DDF0',
borderRadius: 12,
borderWidth: 1,
color: '#38294E',
fontSize: 14,
minHeight: 130,
padding: 13,
},
helperText: {
color: '#746687',
fontSize: 12,
lineHeight: 18,
marginTop: 9,
},
submitButton: {
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 13,
marginTop: 26,
minHeight: 52,
justifyContent: 'center',
paddingHorizontal: 18,
},
submitButtonDisabled: {
backgroundColor: '#CDB9E7',
},
submitButtonText: {
color: '#FFFFFF',
fontSize: 15,
fontWeight: '800',
},
});
