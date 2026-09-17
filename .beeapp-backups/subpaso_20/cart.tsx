import {
useCallback,
useEffect,
useMemo,
useState,
} from 'react';
import {
Alert,
ScrollView,
StyleSheet,
Text,
TextInput,
TouchableOpacity,
View,
} from 'react-native';
import {
ArrowLeft,
CalendarClock,
Clock3,
Minus,
Package,
Plus,
ShoppingBag,
Trash2,
Wrench,
} from 'lucide-react-native';
import {
ApiRequestError,
} from '@beeapp/api-client';

import {
useFocusEffect,
useRouter,
} from 'expo-router';

import type {
CommercialDeliveryFeeMode,
CommercialModality,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
formatCommercialReservationDateTime,
toCommercialReservationStartsAtIso,
} from '../../../src/features/buddyservices/commercialReservationDateTime';
import {
isCommercialInventoryInsufficientError,
toCommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
createBusinessCartRequest,
revalidateBusinessCartAfterRemoteConflict,
} from '../../../src/services/commercialService';
import {
createCommercialRequestIdempotencyKey,
} from '../../../src/features/buddyservices/cart/businessCartRequestPayload';
import {
buddyServicesRequestDetailRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
getBusinessCartDeliveryLabel,
getBusinessCartPresentationLabel,
getBusinessCartSummary,
getBusinessCartTotalStateLabel,
} from '../../../src/features/buddyservices/cart/businessCartSummary';
import {
clearBusinessCart,
getBusinessCart,
getOrCreateBusinessCartSubmissionIdempotencyKey,
subscribeBusinessCart,
updateBusinessCartBookingDetails,
updateBusinessCartLineComment,
updateBusinessCartLineQuantity,
updateBusinessCartRequestDetails,
removeBusinessCartLine,
type BusinessCart,
type BusinessCartLine,
} from '../../../src/features/buddyservices/cart/businessCartStore';

function formatCop(
amount: number | null,
): string {
if (amount === null) {
return 'Pendiente';
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

function formatRequestedServiceDate(
startsAt: string | null,
timezone: string | null,
): string | null {
if (!startsAt) {
return null;
}

try {
return new Intl.DateTimeFormat(
'es-CO',
{
dateStyle: 'medium',
timeStyle: 'short',
...(timezone ? { timeZone: timezone } : {}),
},
).format(new Date(startsAt));
} catch {
return startsAt;
}
}

function getCartModalities(
cart: BusinessCart,
): CommercialModality[] {
return Array.from(
new Set(
cart.lines
.map((line) => line.requestedModality)
.filter((
modality,
): modality is CommercialModality => Boolean(modality)),
),
);
}

function getCartItemsSectionTitle(
summary: ReturnType<typeof getBusinessCartSummary>,
): string {
if (summary.productLineCount > 0 && summary.serviceLineCount > 0) {
return 'Productos y servicios';
}

if (summary.serviceLineCount > 0) {
return 'Servicios';
}

return 'Productos';
}

function getRemoveItemDialogTitle(
line: BusinessCartLine,
): string {
return line.offerKind === 'service'
? 'Eliminar servicio'
: 'Eliminar producto';
}

function getDeliveryFeeOptions(
cart: BusinessCart,
): {
mode: CommercialDeliveryFeeMode;
amount: number | null;
} {
if (cart.requestedModality !== 'delivery') {
return {
mode: 'not_offered',
amount: null,
};
}

return {
mode: cart.deliveryFeeMode,
amount: cart.deliveryFeeAmount,
};
}

function CartLine({
line,
onDecrease,
onIncrease,
onCommentChange,
onBookingDetailsChange,
onBookingModalityChange,
onRemove,
}: {
line: BusinessCartLine;
onDecrease: () => void;
onIncrease: () => void;
onCommentChange: (value: string) => void;
onBookingDetailsChange: (
localDate: string,
localTime: string,
) => void;
onBookingModalityChange: (modality: CommercialModality) => void;
onRemove: () => void;
}) {
const isBookingLine = (
line.offerKind === 'service' && line.requiresBooking
);
const [bookingDate, setBookingDate] = useState('');
const [bookingTime, setBookingTime] = useState('');

useEffect(() => {
if (!line.requestedStartsAt || !line.timezone) {
return;
}

const startsAt = new Date(line.requestedStartsAt);
const dateParts = new Intl.DateTimeFormat('en-GB', {
day: '2-digit',
month: '2-digit',
timeZone: line.timezone,
year: 'numeric',
}).formatToParts(startsAt);
const part = (type: string) => (
dateParts.find((item) => item.type === type)?.value || ''
);
const nextDate = `${part('year')}-${part('month')}-${part('day')}`;
const nextTime = new Intl.DateTimeFormat('en-GB', {
hour: '2-digit',
hour12: false,
minute: '2-digit',
timeZone: line.timezone,
}).format(startsAt);

setBookingDate(nextDate);
setBookingTime(nextTime);
}, [line.requestedStartsAt, line.timezone]);
const lineAmount = (
line.pricingStrategy === 'free'
? 0
: line.unitPriceAmount === null
? null
: line.unitPriceAmount * line.quantity
);

const linePriceLabel = (
line.pricingStrategy === 'starting_at'
? `Desde ${formatCop(lineAmount)}`
: line.pricingStrategy === 'to_be_confirmed'
? 'Precio por confirmar'
: formatCop(lineAmount)
);

return (
<View style={styles.lineCard}>
<View style={styles.lineTopRow}>
<View style={styles.lineIcon}>
{line.offerKind === 'service' ? (
<Wrench
color="#7427D5"
size={20}
/>
) : (
<Package
color="#7427D5"
size={20}
/>
)}
</View>

<View style={styles.lineContent}>
<Text
numberOfLines={2}
style={styles.lineTitle}
>
{line.title}
</Text>

<Text style={styles.linePrice}>
{linePriceLabel}
</Text>

<Text style={styles.lineTypeLabel}>
{line.offerKind === 'service'
? line.requiresBooking
? 'Servicio con reserva'
: 'Servicio'
: 'Producto'}
</Text>

{line.offerKind === 'service'
&& formatRequestedServiceDate(
line.requestedStartsAt,
line.timezone,
) ? (
<Text style={styles.lineServiceDate}>
Fecha y hora solicitadas: {formatRequestedServiceDate(
line.requestedStartsAt,
line.timezone,
)}
</Text>
) : null}
</View>

<TouchableOpacity
accessibilityLabel={`Eliminar ${line.title}`}
accessibilityRole="button"
activeOpacity={0.8}
onPress={onRemove}
style={styles.removeButton}
>
<Trash2
color="#C03C62"
size={18}
/>
</TouchableOpacity>
</View>

<View style={styles.quantityRow}>
<Text style={styles.quantityLabel}>
Cantidad
</Text>

<View style={styles.quantityControls}>
<TouchableOpacity
accessibilityLabel={`Disminuir cantidad de ${line.title}`}
accessibilityRole="button"
accessibilityState={{
disabled: line.quantity <= 1,
}}
activeOpacity={0.8}
disabled={line.quantity <= 1}
onPress={onDecrease}
style={[
styles.quantityButton,
line.quantity <= 1
? styles.quantityButtonDisabled
: null,
]}
>
<Minus
color={
line.quantity <= 1
? '#B9ACC9'
: '#7427D5'
}
size={16}
/>
</TouchableOpacity>

<Text style={styles.quantityValue}>
{line.quantity}
</Text>

<TouchableOpacity
accessibilityLabel={`Aumentar cantidad de ${line.title}`}
accessibilityRole="button"
activeOpacity={0.8}
onPress={onIncrease}
style={styles.quantityButton}
>
<Plus
color="#7427D5"
size={16}
/>
</TouchableOpacity>
</View>
</View>

{isBookingLine ? (
<View style={styles.bookingEditor}>
<View style={styles.bookingEditorHeader}>
<CalendarClock color="#7427D5" size={18} />
<Text style={styles.bookingEditorTitle}>
Configura tu reserva
</Text>
</View>

<Text style={styles.bookingEditorHint}>
Propón fecha y hora. El comercio podrá aceptar, rechazar o negociar las condiciones.
</Text>

<Text style={styles.bookingFieldLabel}>
Modalidad
</Text>

<View style={styles.bookingModalitiesWrap}>
{line.availableModalities.map((modality) => {
const selected = line.requestedModality === modality;

return (
<TouchableOpacity
key={modality}
accessibilityLabel={`Seleccionar ${modalityLabel(modality)}`}
accessibilityRole="button"
accessibilityState={{ selected }}
activeOpacity={0.8}
onPress={() => onBookingModalityChange(modality)}
style={[
styles.bookingModalityButton,
selected ? styles.bookingModalityButtonSelected : null,
]}
>
<Text style={[
styles.bookingModalityButtonText,
selected ? styles.bookingModalityButtonTextSelected : null,
]}>
{modalityLabel(modality)}
</Text>
</TouchableOpacity>
);
})}
</View>

<Text style={styles.bookingFieldLabel}>
Fecha solicitada
</Text>

<TextInput
accessibilityLabel={`Fecha solicitada para ${line.title}`}
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={(value) => {
setBookingDate(value);
onBookingDetailsChange(value, bookingTime);
}}
placeholder="AAAA-MM-DD"
placeholderTextColor="#9C8BAF"
style={styles.bookingInput}
value={bookingDate}
/>

<Text style={styles.bookingFieldLabel}>
Hora solicitada
</Text>

<TextInput
accessibilityLabel={`Hora solicitada para ${line.title}`}
autoCapitalize="none"
keyboardType="numbers-and-punctuation"
onChangeText={(value) => {
setBookingTime(value);
onBookingDetailsChange(bookingDate, value);
}}
placeholder="HH:MM"
placeholderTextColor="#9C8BAF"
style={styles.bookingInput}
value={bookingTime}
/>

{!line.timezone ? (
<Text style={styles.bookingPendingText}>
No se encontró una zona horaria válida para este negocio.
</Text>
) : null}

{line.requestedStartsAt && line.timezone ? (
<Text style={styles.bookingPreview}>
Fecha propuesta: {formatCommercialReservationDateTime(
line.requestedStartsAt,
line.timezone,
)}
</Text>
) : (
<Text style={styles.bookingPendingText}>
Selecciona una fecha y hora futura para continuar.
</Text>
)}
</View>
) : null}

<TextInput
accessibilityLabel={`Comentario para ${line.title}`}
multiline
onChangeText={onCommentChange}
placeholder={`Comentario para este ${line.offerKind === 'service' ? 'servicio' : 'producto'} (opcional)`}
placeholderTextColor="#9C8BAF"
style={styles.lineCommentInput}
value={line.lineComment || ''}
/>
</View>
);
}

export default function BuddyServicesCartScreen() {
const router = useRouter();

const [cart, setCart] = useState<BusinessCart | null>(
() => getBusinessCart(),
);
const [submitting, setSubmitting] = useState(false);
const [cartUpdateNotice, setCartUpdateNotice] = useState<string | null>(
null,
);

useEffect(() => (
subscribeBusinessCart((change) => {
setCart(change.cart);
})
), []);

useFocusEffect(
useCallback(() => {
setCart(getBusinessCart());
}, []),
);

const modalities = useMemo(() => (
cart
? getCartModalities(cart)
: []
), [cart]);

const deliveryOptions = useMemo(() => (
cart
? getDeliveryFeeOptions(cart)
: {
mode: 'not_offered' as CommercialDeliveryFeeMode,
amount: null,
}
), [cart]);

const summary = useMemo(() => (
cart
? getBusinessCartSummary(cart, {
deliveryFeeMode: deliveryOptions.mode,
deliveryFeeAmount: deliveryOptions.amount,
})
: null
), [
cart,
deliveryOptions.amount,
deliveryOptions.mode,
]);


const deliveryAddressRequired = Boolean(
cart?.requestedModality === 'delivery'
&& !cart.deliveryAddress?.trim(),
);

const bookingLinesIncomplete = Boolean(
cart?.lines.some((line) => (
line.offerKind === 'service'
&& line.requiresBooking
&& (
!line.requestedModality
|| !line.requestedStartsAt
|| !line.timezone
)
)),
);

const canContinue = Boolean(
cart
&& summary
&& !submitting
&& cart.requestedModality
&& !deliveryAddressRequired
&& !bookingLinesIncomplete,
);

const handleBack = useCallback(() => {
if (router.canGoBack()) {
router.back();
return;
}

router.replace('/(main)/beeservices');
}, [router]);

const handleSelectModality = useCallback((
modality: CommercialModality,
) => {
setCartUpdateNotice(null);
updateBusinessCartRequestDetails({
requestedModality: modality,
});
}, []);

const handleClear = useCallback(() => {
if (!cart) {
return;
}

Alert.alert(
'Vaciar carrito',
'Se eliminarán todos los productos y servicios de esta solicitud.',
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Vaciar carrito',
style: 'destructive',
onPress: () => {
setCartUpdateNotice(null);
clearBusinessCart();
},
},
],
);
}, [cart]);

const handleContinue = useCallback(async () => {
if (!cart || !summary || submitting) {
return;
}

if (!cart.requestedModality) {
Alert.alert(
'Selecciona una modalidad',
'Elige cómo deseas recibir o atender los ítems de esta solicitud.',
);
return;
}

if (
cart.requestedModality === 'delivery'
&& !cart.deliveryAddress?.trim()
) {
Alert.alert(
'Dirección requerida',
'Ingresa la dirección para la entrega a domicilio.',
);
return;
}

setSubmitting(true);

try {
const response = await createBusinessCartRequest(
cart,
getOrCreateBusinessCartSubmissionIdempotencyKey(
createCommercialRequestIdempotencyKey,
),
);

clearBusinessCart();

router.replace(
buddyServicesRequestDetailRoute(
response.request.request_id,
),
);
} catch (error) {
const uiError = toCommercialUiError(error);
const isInsufficientInventory = (
isCommercialInventoryInsufficientError(error)
);
const shouldRevalidate = (
!isInsufficientInventory
&& error instanceof ApiRequestError
&& [400, 404, 409, 422].includes(error.status)
);

if (shouldRevalidate) {
try {
const result = await revalidateBusinessCartAfterRemoteConflict(
cart,
);

const notice = (
`${result.updatedLineCount} línea(s) actualizada(s) y `
+ `${result.removedLineCount} línea(s) eliminada(s) por cambios remotos. `
+ 'Revisa los ítems, la modalidad y el resumen antes de continuar.'
);

setCartUpdateNotice(notice);

Alert.alert(
'Carrito actualizado',
`${uiError.message} ${notice}`,
);
} catch {
Alert.alert(
uiError.title,
uiError.message,
);
}
} else {
Alert.alert(
uiError.title,
uiError.message,
);
}
} finally {
setSubmitting(false);
}
}, [cart, router, submitting, summary]);

if (!cart || cart.lines.length === 0 || !summary) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.emptyContainer}>
{cartUpdateNotice ? (
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.emptyCartUpdateNotice}
>
<Text style={styles.emptyCartUpdateNoticeTitle}>
Tu carrito fue actualizado
</Text>

<Text style={styles.emptyCartUpdateNoticeText}>
{cartUpdateNotice}
</Text>
</View>
) : null}

<View style={styles.emptyIcon}>
<ShoppingBag
color="#7427D5"
size={34}
/>
</View>

<Text style={styles.emptyTitle}>
Tu carrito está vacío
</Text>

<Text style={styles.emptyText}>
Agrega productos o servicios de un negocio para crear una
solicitud formal.
</Text>

<TouchableOpacity
accessibilityLabel="Explorar negocios"
accessibilityRole="button"
activeOpacity={0.8}
onPress={handleBack}
style={styles.primaryButton}
>
<Text style={styles.primaryButtonText}>
Explorar negocios
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
<ArrowLeft
color="#38294E"
size={22}
/>
</TouchableOpacity>

<View style={styles.headerText}>
<Text style={styles.headerTitle}>
Tu solicitud
</Text>

<Text
numberOfLines={1}
style={styles.businessName}
>
{cart.commercialProfileName}
</Text>
</View>

<TouchableOpacity
accessibilityLabel="Vaciar carrito"
accessibilityRole="button"
activeOpacity={0.8}
onPress={handleClear}
style={styles.headerClearButton}
>
<Trash2
color="#B43659"
size={19}
/>
</TouchableOpacity>
</View>

<ScrollView
contentContainerStyle={styles.content}
showsVerticalScrollIndicator={false}
>
{cartUpdateNotice ? (
<View
accessibilityLiveRegion="polite"
accessibilityRole="alert"
style={styles.cartUpdateNotice}
>
<Text style={styles.cartUpdateNoticeTitle}>
Tu carrito fue actualizado
</Text>

<Text style={styles.cartUpdateNoticeText}>
{cartUpdateNotice}
</Text>
</View>
) : null}

<View style={styles.businessBanner}>
<ShoppingBag
color="#7427D5"
size={20}
/>

<Text style={styles.businessBannerText}>
Los ítems de esta solicitud pertenecen a
{` ${cart.commercialProfileName}.`}
</Text>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>
{getCartItemsSectionTitle(summary)}
</Text>

{cart.lines.map((line) => (
<CartLine
key={line.id}
line={line}
onDecrease={() => {
setCartUpdateNotice(null);
updateBusinessCartLineQuantity(
line.id,
line.quantity - 1,
);
}}
onIncrease={() => {
setCartUpdateNotice(null);
updateBusinessCartLineQuantity(
line.id,
line.quantity + 1,
);
}}
onCommentChange={(value) => {
setCartUpdateNotice(null);
updateBusinessCartLineComment(line.id, value);
}}
onBookingDetailsChange={(localDate, localTime) => {
if (
line.offerKind !== 'service'
|| !line.requiresBooking
|| !line.timezone
|| !localDate.trim()
|| !localTime.trim()
) {
return;
}

try {
const requestedStartsAt = toCommercialReservationStartsAtIso({
localDate,
localTime,
timezone: line.timezone,
});
const requestedEndsAt = line.durationMinutes
? new Date(
new Date(requestedStartsAt).getTime()
+ (line.durationMinutes * 60 * 1000),
).toISOString()
: null;

setCartUpdateNotice(null);
updateBusinessCartBookingDetails(line.id, {
requestedStartsAt,
requestedEndsAt,
timezone: line.timezone,
});
} catch {
setCartUpdateNotice(
'Usa una fecha futura AAAA-MM-DD y una hora HH:MM válidas.',
);
}
}}
onBookingModalityChange={(requestedModality) => {
setCartUpdateNotice(null);
updateBusinessCartBookingDetails(line.id, {
requestedModality,
});
updateBusinessCartRequestDetails({
requestedModality,
});
}}
onRemove={() => {
Alert.alert(
getRemoveItemDialogTitle(line),
`¿Quieres eliminar ${line.title} de la solicitud?`,
[
{
text: 'Cancelar',
style: 'cancel',
},
{
text: 'Eliminar',
style: 'destructive',
onPress: () => {
setCartUpdateNotice(null);
removeBusinessCartLine(line.id);
},
},
],
);
}}
/>
))}
</View>

{modalities.length > 0 && summary.presentationKind !== 'reservation' ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Modalidad de atención
</Text>

<View style={styles.modalitiesWrap}>
{modalities.map((modality) => {
const selected = (
cart.requestedModality === modality
);

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
onPress={() => handleSelectModality(modality)}
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
</View>
) : null}

{cart.requestedModality === 'delivery' ? (
<View style={styles.section}>
<Text style={styles.sectionTitle}>
Datos de entrega
</Text>

<Text style={styles.deliveryRequiredHint}>
La dirección es obligatoria para domicilio.
</Text>

<TextInput
accessibilityLabel="Dirección de entrega obligatoria"
onChangeText={(deliveryAddress) => {
setCartUpdateNotice(null);
updateBusinessCartRequestDetails({
deliveryAddress,
});
}}
placeholder="Dirección de entrega"
placeholderTextColor="#9C8BAF"
style={[
styles.input,
deliveryAddressRequired ? styles.inputRequired : null,
]}
value={cart.deliveryAddress || ''}
/>

<TextInput
accessibilityLabel="Referencia de entrega"
onChangeText={(deliveryReference) => {
setCartUpdateNotice(null);
updateBusinessCartRequestDetails({
deliveryReference,
});
}}
placeholder="Referencia o indicaciones (opcional)"
placeholderTextColor="#9C8BAF"
style={[
styles.input,
styles.inputSpacing,
]}
value={cart.deliveryReference || ''}
/>
</View>
) : null}

<View style={styles.section}>
<Text style={styles.sectionTitle}>
Comentario general
</Text>

<TextInput
accessibilityLabel="Comentario general de la solicitud"
multiline
onChangeText={(customerNote) => {
setCartUpdateNotice(null);
updateBusinessCartRequestDetails({
customerNote,
});
}}
placeholder="Cuéntale al negocio algo importante (opcional)"
placeholderTextColor="#9C8BAF"
style={styles.noteInput}
value={cart.customerNote || ''}
/>
</View>

<View style={styles.summaryCard}>
<Text style={styles.summaryTitle}>
{getBusinessCartPresentationLabel(summary.presentationKind)}
</Text>

<SummaryRow
label={`${summary.productItemCount} producto${(
summary.productItemCount === 1
? ''
: 's'
)}${summary.serviceItemCount
? ` · ${summary.serviceItemCount} servicio${(
summary.serviceItemCount === 1
? ''
: 's'
)}`
: ''}`}
value={formatCop(summary.subtotalAmount)}
/>

<SummaryRow
label={getBusinessCartDeliveryLabel(summary)}
value={
summary.deliveryFeeMode === 'to_be_confirmed'
? 'Por confirmar'
: formatCop(summary.deliveryFeeAmount)
}
/>

<View style={styles.summaryDivider} />

<View style={styles.totalRow}>
<View>
<Text style={styles.totalLabel}>
{getBusinessCartTotalStateLabel(summary.totalState)}
</Text>

{summary.totalState === 'estimated' ? (
<Text style={styles.totalHint}>
Incluye valores “desde”; no es un total final.
</Text>
) : summary.totalState === 'pending_confirmation' ? (
<Text style={styles.totalHint}>
El negocio confirmará los valores pendientes.
</Text>
) : null}
</View>

<Text style={styles.totalValue}>
{formatCop(summary.totalAmount)}
</Text>
</View>
</View>

<Text style={styles.legalHint}>
Enviarás una solicitud formal. No representa un
pedido final hasta que el negocio la revise y acepte.
</Text>

<TouchableOpacity
accessibilityLabel={
submitting
? 'Enviando solicitud'
: 'Continuar con la solicitud'
}
accessibilityRole="button"
accessibilityState={{
busy: submitting,
disabled: !canContinue,
}}
activeOpacity={0.85}
disabled={!canContinue}
onPress={handleContinue}
style={[
styles.continueButton,
!canContinue
? styles.continueButtonDisabled
: null,
]}
>
<Text style={styles.continueButtonText}>
{submitting
? 'Enviando solicitud...'
: 'Continuar con la solicitud'}
</Text>
</TouchableOpacity>
</ScrollView>
</View>
</ScreenSafeArea>
);
}

function SummaryRow({
label,
value,
}: {
label: string;
value: string;
}) {
return (
<View style={styles.summaryRow}>
<Text style={styles.summaryLabel}>
{label}
</Text>

<Text style={styles.summaryValue}>
{value}
</Text>
</View>
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
height: 40,
justifyContent: 'center',
width: 40,
},
headerText: {
flex: 1,
marginHorizontal: 8,
},
headerTitle: {
color: '#2D2141',
fontSize: 17,
fontWeight: '800',
},
businessName: {
color: '#7A579D',
fontSize: 12,
fontWeight: '600',
marginTop: 2,
},
headerClearButton: {
alignItems: 'center',
height: 40,
justifyContent: 'center',
width: 40,
},
content: {
padding: 16,
paddingBottom: 34,
},
cartUpdateNotice: {
backgroundColor: '#FFF5D6',
borderColor: '#D99000',
borderRadius: 14,
borderWidth: 1,
marginBottom: 14,
padding: 13,
},
cartUpdateNoticeTitle: {
color: '#6B4100',
fontSize: 14,
fontWeight: '800',
},
cartUpdateNoticeText: {
color: '#6B4100',
fontSize: 13,
lineHeight: 19,
marginTop: 4,
},
businessBanner: {
alignItems: 'center',
backgroundColor: '#F2E8FF',
borderColor: '#E4D2FA',
borderRadius: 14,
borderWidth: 1,
flexDirection: 'row',
marginBottom: 20,
padding: 13,
},
businessBannerText: {
color: '#56357D',
flex: 1,
fontSize: 13,
lineHeight: 19,
marginLeft: 9,
},
section: {
marginBottom: 20,
},
sectionTitle: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
marginBottom: 10,
},
lineCard: {
backgroundColor: '#FFFFFF',
borderColor: '#EEE7F3',
borderRadius: 17,
borderWidth: 1,
marginBottom: 11,
padding: 13,
},
lineTopRow: {
alignItems: 'flex-start',
flexDirection: 'row',
},
lineIcon: {
alignItems: 'center',
backgroundColor: '#F4EAFE',
borderRadius: 12,
height: 42,
justifyContent: 'center',
width: 42,
},
lineContent: {
flex: 1,
marginHorizontal: 10,
},
lineTitle: {
color: '#362747',
fontSize: 14,
fontWeight: '800',
lineHeight: 19,
},
linePrice: {
color: '#6A2AAE',
fontSize: 13,
fontWeight: '800',
marginTop: 5,
},
lineTypeLabel: {
color: '#7A5D9B',
fontSize: 12,
fontWeight: '700',
marginTop: 4,
},
lineServiceDate: {
color: '#7A5D9B',
fontSize: 12,
lineHeight: 17,
marginTop: 4,
},
removeButton: {
alignItems: 'center',
height: 34,
justifyContent: 'center',
width: 34,
},
quantityRow: {
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 14,
},
quantityLabel: {
color: '#725D8D',
fontSize: 13,
fontWeight: '700',
},
quantityControls: {
alignItems: 'center',
flexDirection: 'row',
},
quantityButton: {
alignItems: 'center',
backgroundColor: '#F5EDFC',
borderRadius: 10,
height: 31,
justifyContent: 'center',
width: 31,
},
quantityButtonDisabled: {
backgroundColor: '#F4F1F6',
},
quantityValue: {
color: '#38294E',
fontSize: 14,
fontWeight: '800',
minWidth: 39,
textAlign: 'center',
},
bookingEditor: {
backgroundColor: '#F8F2FD',
borderColor: '#E5D5F3',
borderRadius: 13,
borderWidth: 1,
marginTop: 14,
padding: 12,
},
bookingEditorHeader: {
alignItems: 'center',
flexDirection: 'row',
},
bookingEditorTitle: {
color: '#4E286E',
fontSize: 13,
fontWeight: '900',
marginLeft: 7,
},
bookingEditorHint: {
color: '#755B8D',
fontSize: 12,
lineHeight: 17,
marginTop: 7,
},
bookingModalityText: {
color: '#623A83',
fontSize: 12,
fontWeight: '800',
lineHeight: 18,
marginTop: 9,
},
bookingModalitiesWrap: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
marginTop: 7,
},
bookingModalityButton: {
backgroundColor: '#FFFFFF',
borderColor: '#DCCBEF',
borderRadius: 16,
borderWidth: 1,
paddingHorizontal: 11,
paddingVertical: 8,
},
bookingModalityButtonSelected: {
backgroundColor: '#7427D5',
borderColor: '#7427D5',
},
bookingModalityButtonText: {
color: '#623D8B',
fontSize: 12,
fontWeight: '800',
},
bookingModalityButtonTextSelected: {
color: '#FFFFFF',
},
bookingFieldLabel: {
color: '#604678',
fontSize: 12,
fontWeight: '800',
marginTop: 12,
},
bookingInput: {
backgroundColor: '#FFFFFF',
borderColor: '#DBC9EC',
borderRadius: 10,
borderWidth: 1,
color: '#38294E',
fontSize: 13,
marginTop: 6,
minHeight: 44,
paddingHorizontal: 11,
},
bookingPreview: {
color: '#623A83',
fontSize: 12,
fontWeight: '800',
lineHeight: 18,
marginTop: 12,
},
bookingPendingText: {
color: '#A22020',
fontSize: 12,
fontWeight: '700',
lineHeight: 18,
marginTop: 12,
},
lineCommentInput: {
backgroundColor: '#FBF9FE',
borderColor: '#EBE1F2',
borderRadius: 11,
borderWidth: 1,
color: '#38294E',
fontSize: 13,
marginTop: 14,
minHeight: 67,
padding: 10,
textAlignVertical: 'top',
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
deliveryRequiredHint: {
color: '#B42318',
fontSize: 13,
fontWeight: '700',
marginBottom: 10,
},
inputRequired: {
borderColor: '#D92D20',
borderWidth: 1.5,
},
noteInput: {
backgroundColor: '#FFFFFF',
borderColor: '#E7DDF0',
borderRadius: 12,
borderWidth: 1,
color: '#38294E',
fontSize: 14,
minHeight: 86,
padding: 13,
textAlignVertical: 'top',
},
summaryCard: {
backgroundColor: '#FFFFFF',
borderColor: '#E9DDF2',
borderRadius: 18,
borderWidth: 1,
marginTop: 2,
padding: 16,
},
summaryTitle: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
marginBottom: 11,
},
summaryRow: {
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 8,
},
summaryLabel: {
color: '#715C89',
fontSize: 13,
},
summaryValue: {
color: '#4B3568',
fontSize: 13,
fontWeight: '700',
},
summaryDivider: {
backgroundColor: '#EEE7F3',
height: 1,
marginVertical: 14,
},
totalRow: {
alignItems: 'flex-end',
flexDirection: 'row',
justifyContent: 'space-between',
},
totalLabel: {
color: '#3B294F',
fontSize: 14,
fontWeight: '800',
},
totalHint: {
color: '#8A719F',
fontSize: 11,
lineHeight: 15,
marginTop: 4,
maxWidth: 195,
},
totalValue: {
color: '#6724B6',
fontSize: 19,
fontWeight: '900',
},
legalHint: {
color: '#806C98',
fontSize: 12,
lineHeight: 18,
marginHorizontal: 4,
marginTop: 14,
},
continueButtonDisabled: {
opacity: 0.65,
},
continueButton: {
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 14,
marginTop: 17,
minHeight: 52,
justifyContent: 'center',
paddingHorizontal: 18,
},
continueButtonText: {
color: '#FFFFFF',
fontSize: 15,
fontWeight: '800',
},
emptyContainer: {
alignItems: 'center',
flex: 1,
justifyContent: 'center',
paddingHorizontal: 32,
},
emptyCartUpdateNotice: {
alignSelf: 'stretch',
backgroundColor: '#FFF5D6',
borderColor: '#D99000',
borderRadius: 14,
borderWidth: 1,
marginBottom: 20,
padding: 13,
},
emptyCartUpdateNoticeTitle: {
color: '#6B4100',
fontSize: 14,
fontWeight: '800',
},
emptyCartUpdateNoticeText: {
color: '#6B4100',
fontSize: 13,
lineHeight: 19,
marginTop: 4,
},
emptyIcon: {
alignItems: 'center',
backgroundColor: '#F2E7FD',
borderRadius: 22,
height: 70,
justifyContent: 'center',
width: 70,
},
emptyTitle: {
color: '#38294E',
fontSize: 19,
fontWeight: '900',
marginTop: 16,
},
emptyText: {
color: '#7B668F',
fontSize: 14,
lineHeight: 21,
marginTop: 8,
textAlign: 'center',
},
primaryButton: {
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 14,
marginTop: 21,
minHeight: 49,
justifyContent: 'center',
paddingHorizontal: 22,
},
primaryButtonText: {
color: '#FFFFFF',
fontSize: 14,
fontWeight: '800',
},
});
