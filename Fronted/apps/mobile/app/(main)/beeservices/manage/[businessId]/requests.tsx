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
CalendarDays,
ChevronRight,
ClipboardList,
Package,
Wrench,
} from 'lucide-react-native';
import {
useLocalSearchParams,
useRouter,
} from 'expo-router';

import type {
CommercialRequestListItem,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
type CommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
getCommercialModalityLabel,
} from '../../../../../src/features/buddyservices/commercialLabels';
import {
buddyServicesManageBusinessRoute,
buddyServicesManageRequestDetailRoute,
} from '../../../../../src/features/buddyservices/commercialRoutes';
import {
formatCommercialRequestListAmount,
formatCommercialRequestListDate,
getCommercialRequestListItemCountLabel,
getCommercialRequestListStatusLabel,
getCommercialRequestListStatusTone,
getCommercialRequestListTypeLabel,
} from '../../../../../src/features/buddyservices/commercialRequestListPresentation';
import {
loadOwnedCommercialRequests,
} from '../../../../../src/services/commercialService';

const REQUEST_LIST_LIMIT = 25;

function normalizeBusinessId(
value: string | string[] | undefined,
): string {
if (Array.isArray(value)) {
return String(value[0] || '').trim();
}

return String(value || '').trim();
}

function RequestTypeIcon(
{
requestType,
}: {
requestType: CommercialRequestListItem['request_type'];
},
) {
if (requestType === 'booking_request') {
return <CalendarDays color="#7427D5" size={19} />;
}

if (requestType === 'service_request') {
return <Wrench color="#7427D5" size={19} />;
}

return <Package color="#7427D5" size={19} />;
}

export default function BuddyServicesManageRequestsScreen() {
const router = useRouter();
const params = useLocalSearchParams<{
businessId?: string | string[];
}>();

const businessId = normalizeBusinessId(params.businessId);

const [requests, setRequests] = useState<
CommercialRequestListItem[]
>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState<CommercialUiError | null>(
null,
);

const loadRequests = useCallback(async () => {
if (!businessId) {
setError({
title: 'Negocio no identificado',
message: 'No fue posible identificar el negocio.',
retryable: false,
});
setLoading(false);
return;
}

setLoading(true);
setError(null);

try {
const response = await loadOwnedCommercialRequests(
businessId,
{
limit: REQUEST_LIST_LIMIT,
offset: 0,
},
);

setRequests(response.requests);
} catch (loadError) {
setError(toCommercialUiError(loadError));
} finally {
setLoading(false);
}
}, [businessId]);

useEffect(() => {
void loadRequests();
}, [loadRequests]);

const handleRefresh = useCallback(async () => {
setRefreshing(true);

try {
await loadRequests();
} finally {
setRefreshing(false);
}
}, [loadRequests]);

const handleBack = useCallback(() => {
if (router.canGoBack()) {
router.back();
return;
}

if (businessId) {
router.replace(
buddyServicesManageBusinessRoute(businessId),
);
}
}, [businessId, router]);

const handleOpenRequest = useCallback((
requestId: string,
) => {
router.push(
buddyServicesManageRequestDetailRoute(
businessId,
requestId,
),
);
}, [businessId, router]);

if (loading) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<ActivityIndicator color="#7427D5" size="large" />
<Text style={styles.centeredText}>
Cargando solicitudes del negocio...
</Text>
</View>
</ScreenSafeArea>
);
}

if (error) {
return (
<ScreenSafeArea style={styles.safeArea}>
<View style={styles.centered}>
<ClipboardList color="#7427D5" size={36} />
<Text style={styles.errorTitle}>
{error.title}
</Text>
<Text style={styles.errorText}>
{error.message}
</Text>
{error.retryable ? (
<TouchableOpacity
accessibilityLabel="Reintentar cargar solicitudes del negocio"
accessibilityRole="button"
activeOpacity={0.82}
onPress={() => {
void loadRequests();
}}
style={styles.primaryButton}
>
<Text style={styles.primaryButtonText}>
Reintentar
</Text>
</TouchableOpacity>
) : null}
<TouchableOpacity
accessibilityLabel="Volver a gestión del negocio"
accessibilityRole="button"
activeOpacity={0.82}
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
accessibilityLabel="Volver a gestión del negocio"
accessibilityRole="button"
onPress={handleBack}
style={styles.backButton}
>
<ArrowLeft color="#38294E" size={22} />
</TouchableOpacity>

<View style={styles.headerText}>
<Text style={styles.title}>
Solicitudes
</Text>
<Text style={styles.subtitle}>
Compras, servicios y reservas recibidas por tu negocio.
</Text>
</View>
</View>

{requests.length === 0 ? (
<View style={styles.emptyState}>
<ClipboardList color="#7427D5" size={36} />
<Text style={styles.emptyTitle}>
Aún no tienes solicitudes
</Text>
<Text style={styles.emptyText}>
Las solicitudes recibidas aparecerán aquí para que puedas revisarlas.
</Text>
</View>
) : (
<View style={styles.list}>
{requests.map((request) => (
<TouchableOpacity
key={request.id}
accessibilityHint="Abre el detalle de esta solicitud"
accessibilityLabel={
`Abrir ${getCommercialRequestListTypeLabel(request.request_type)} `
+ `${request.code}`
}
accessibilityRole="button"
activeOpacity={0.8}
onPress={() => handleOpenRequest(request.id)}
style={styles.requestCard}
>
<View style={styles.cardTopRow}>
<View style={styles.typeIcon}>
<RequestTypeIcon
requestType={request.request_type}
/>
</View>

<View style={styles.cardTitleWrap}>
<Text style={styles.requestType}>
{getCommercialRequestListTypeLabel(request.request_type)}
</Text>
<Text style={styles.requestCode}>
{request.code}
</Text>
</View>

<ChevronRight color="#8B769D" size={20} />
</View>

<View style={styles.statusRow}>
<View style={[
styles.statusBadge,
statusToneStyles[
getCommercialRequestListStatusTone(request.status)
],
]}>
<Text style={styles.statusText}>
{getCommercialRequestListStatusLabel(request.status)}
</Text>
</View>

<Text style={styles.itemCount}>
{getCommercialRequestListItemCountLabel(request.item_count)}
</Text>
</View>

<View style={styles.cardDetails}>
<Text style={styles.detailText}>
Modalidad: {request.requested_modality
? getCommercialModalityLabel(
request.requested_modality,
)
: 'Por confirmar'}
</Text>

<Text style={styles.detailText}>
Recibida: {formatCommercialRequestListDate(request.created_at)}
</Text>
</View>

<View style={styles.totalRow}>
<Text style={styles.totalLabel}>
Total
</Text>
<Text style={styles.totalAmount}>
{formatCommercialRequestListAmount(
request.total_amount,
request.currency_code,
)}
</Text>
</View>
</TouchableOpacity>
))}
</View>
)}
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
flexGrow: 1,
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
color: '#5E506B',
fontSize: 15,
marginTop: 14,
textAlign: 'center',
},
header: {
alignItems: 'center',
flexDirection: 'row',
gap: 12,
marginBottom: 22,
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
title: {
color: '#38294E',
fontSize: 25,
fontWeight: '800',
letterSpacing: -0.4,
},
subtitle: {
color: '#6D5C7B',
fontSize: 14,
lineHeight: 20,
marginTop: 4,
},
list: {
gap: 13,
},
requestCard: {
backgroundColor: '#FFFFFF',
borderColor: '#EAE3F0',
borderRadius: 17,
borderWidth: 1,
padding: 16,
shadowColor: '#38294E',
shadowOffset: {
width: 0,
height: 3,
},
shadowOpacity: 0.05,
shadowRadius: 10,
elevation: 2,
},
cardTopRow: {
alignItems: 'center',
flexDirection: 'row',
},
typeIcon: {
alignItems: 'center',
backgroundColor: '#F3E8FE',
borderRadius: 12,
height: 42,
justifyContent: 'center',
marginRight: 11,
width: 42,
},
cardTitleWrap: {
flex: 1,
},
requestType: {
color: '#6A5780',
fontSize: 12,
fontWeight: '700',
textTransform: 'uppercase',
},
requestCode: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
marginTop: 2,
},
statusRow: {
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 15,
},
statusBadge: {
borderRadius: 999,
paddingHorizontal: 10,
paddingVertical: 5,
},
statusNeutral: {
backgroundColor: '#EEE7F3',
},
statusSuccess: {
backgroundColor: '#E1F4E8',
},
statusWarning: {
backgroundColor: '#FFF0D8',
},
statusDanger: {
backgroundColor: '#FCE3E5',
},
statusText: {
color: '#4E3D5D',
fontSize: 12,
fontWeight: '700',
},
itemCount: {
color: '#766383',
fontSize: 13,
},
cardDetails: {
borderBottomColor: '#F0EBF4',
borderBottomWidth: 1,
gap: 5,
marginTop: 14,
paddingBottom: 14,
},
detailText: {
color: '#675674',
fontSize: 13,
lineHeight: 18,
},
totalRow: {
alignItems: 'baseline',
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 13,
},
totalLabel: {
color: '#675674',
fontSize: 13,
fontWeight: '600',
},
totalAmount: {
color: '#38294E',
fontSize: 16,
fontWeight: '800',
},
emptyState: {
alignItems: 'center',
backgroundColor: '#F5EDFC',
borderColor: '#E5D9F1',
borderRadius: 18,
borderWidth: 1,
marginTop: 18,
paddingHorizontal: 24,
paddingVertical: 34,
},
emptyTitle: {
color: '#38294E',
fontSize: 18,
fontWeight: '800',
marginTop: 14,
textAlign: 'center',
},
emptyText: {
color: '#695877',
fontSize: 14,
lineHeight: 20,
marginTop: 8,
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
color: '#6D5C7B',
fontSize: 14,
lineHeight: 20,
marginTop: 8,
textAlign: 'center',
},
primaryButton: {
backgroundColor: '#7427D5',
borderRadius: 12,
marginTop: 20,
paddingHorizontal: 18,
paddingVertical: 13,
},
primaryButtonText: {
color: '#FFFFFF',
fontSize: 14,
fontWeight: '800',
},
secondaryButton: {
marginTop: 10,
padding: 12,
},
secondaryButtonText: {
color: '#7427D5',
fontSize: 14,
fontWeight: '800',
},
});

const statusToneStyles = StyleSheet.create({
neutral: styles.statusNeutral,
success: styles.statusSuccess,
warning: styles.statusWarning,
danger: styles.statusDanger,
});
