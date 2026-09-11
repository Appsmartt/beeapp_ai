import {
ActivityIndicator,
Alert,
Modal,
ScrollView,
Text,
TextInput,
TouchableOpacity,
View,
} from 'react-native';
import {
ArrowLeft,
CircleAlert,
Play,
Plus,
Power,
X,
} from 'lucide-react-native';
import {
useCallback,
useEffect,
useState,
} from 'react';
import {
useRouter,
} from 'expo-router';

import type {
CommercialOwnedProfile,
} from '@beeapp/shared-types';

import OwnedCommercialProfileCard from '../../../src/components/buddyservices/OwnedCommercialProfileCard';
import OwnedCommercialProfilesState from '../../../src/components/buddyservices/OwnedCommercialProfilesState';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
toCommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
buddyServicesCreateBusinessRoute,
buddyServicesManageBusinessRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
loadOwnedCommercialProfiles,
updateOwnedCommercialProfilePublication,
} from '../../../src/services/commercialService';

export default function BuddyServicesMyBusinessesScreen() {
const router = useRouter();

const [profiles, setProfiles] = useState<
CommercialOwnedProfile[]
>([]);
const [isLoading, setIsLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState<
string | null
>(null);
const [selectedProfile, setSelectedProfile] = useState<
CommercialOwnedProfile | null
>(null);
const [archiveReason, setArchiveReason] = useState('');
const [isSubmittingPublication, setIsSubmittingPublication] = (
useState(false)
);
const [updatingProfileId, setUpdatingProfileId] = useState<
string | null
>(null);

const loadProfiles = useCallback(async () => {
setIsLoading(true);
setErrorMessage(null);

try {
const response = await loadOwnedCommercialProfiles();

setProfiles(response.profiles);
} catch (error) {
const uiError = toCommercialUiError(error);

setErrorMessage(uiError.message);
} finally {
setIsLoading(false);
}
}, []);

useEffect(() => {
void loadProfiles();
}, [loadProfiles]);

const closePublicationModal = useCallback(() => {
if (isSubmittingPublication) {
return;
}

setSelectedProfile(null);
setArchiveReason('');
}, [isSubmittingPublication]);

const replaceProfile = useCallback((
updatedProfile: CommercialOwnedProfile,
) => {
setProfiles((currentProfiles) => (
currentProfiles.map((profile) => (
profile.id === updatedProfile.id
? updatedProfile
: profile
))
));
}, []);

const submitPublicationChange = useCallback(async () => {
if (!selectedProfile) {
return;
}

const isArchived = (
selectedProfile.publication_status === 'archived'
);
const isPaused = (
selectedProfile.publication_status === 'paused'
);
const isDeactivation = !isArchived && !isPaused;
const normalizedReason = archiveReason.trim();

if (isDeactivation && !normalizedReason) {
Alert.alert(
'Motivo requerido',
'Escribe el motivo para desactivar este negocio.',
);
return;
}

setIsSubmittingPublication(true);
setUpdatingProfileId(selectedProfile.id);

try {
const response = await updateOwnedCommercialProfilePublication(
selectedProfile.id,
isArchived
? {
publication_status: 'paused',
}
: isPaused
? {
publication_status: 'published',
}
: {
publication_status: 'archived',
reason_code: 'owner_request',
reason_text: normalizedReason,
},
);

replaceProfile(response.profile);
setSelectedProfile(null);
setArchiveReason('');

Alert.alert(
isArchived
? 'Negocio restaurado'
: isPaused
? 'Negocio activado'
: 'Negocio desactivado',
isArchived
? (
'Tu negocio fue restaurado como pausado. '
+ 'Publícalo cuando esté listo para clientes.'
)
: isPaused
? (
'Tu negocio ya está publicado y disponible '
+ 'para clientes.'
)
: (
'Tu negocio fue desactivado y dejó de estar '
+ 'disponible para clientes.'
),
);
} catch (error) {
const uiError = toCommercialUiError(error);

Alert.alert(
'No fue posible cambiar el estado',
uiError.message,
);
} finally {
setIsSubmittingPublication(false);
setUpdatingProfileId(null);
}
}, [
archiveReason,
replaceProfile,
selectedProfile,
]);

const openPublicationModal = useCallback((
profile: CommercialOwnedProfile,
) => {
setSelectedProfile(profile);
setArchiveReason('');
}, []);

const selectedIsArchived = (
selectedProfile?.publication_status === 'archived'
);
const selectedIsPaused = (
selectedProfile?.publication_status === 'paused'
);
const selectedIsDeactivation = Boolean(
selectedProfile
&& !selectedIsArchived
&& !selectedIsPaused
);

return (
<ScreenSafeArea
style={{
backgroundColor: '#FFFCF9',
flex: 1,
}}
>
<View
style={{
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'space-between',
paddingHorizontal: 18,
paddingTop: 10,
}}
>
<TouchableOpacity
accessibilityLabel="Volver a BuddyServices"
accessibilityRole="button"
activeOpacity={0.8}
onPress={() => router.back()}
style={{
alignItems: 'center',
backgroundColor: '#F4EDF9',
borderRadius: 14,
height: 42,
justifyContent: 'center',
width: 42,
}}
>
<ArrowLeft
color="#3D245E"
size={21}
/>
</TouchableOpacity>

<Text
style={{
color: '#261743',
fontSize: 19,
fontWeight: '800',
}}
>
Mis negocios
</Text>

<View
style={{
width: 42,
}}
/>
</View>

{isLoading ? (
<OwnedCommercialProfilesState kind="loading" />
) : errorMessage ? (
<OwnedCommercialProfilesState
kind="error"
message={errorMessage}
onRetry={() => {
void loadProfiles();
}}
/>
) : (
<ScrollView
contentContainerStyle={{
paddingBottom: 34,
paddingHorizontal: 18,
paddingTop: 22,
}}
showsVerticalScrollIndicator={false}
>
<Text
style={{
color: '#261743',
fontSize: 23,
fontWeight: '900',
}}
>
Administra tus negocios
</Text>

<Text
style={{
color: '#786593',
fontSize: 14,
lineHeight: 21,
marginTop: 7,
}}
>
Cada negocio conserva sus propios catálogos,
ofertas, pagos y operaciones.
</Text>

{profiles.length === 0 ? (
<OwnedCommercialProfilesState kind="empty" />
) : (
<View
style={{
marginTop: 20,
}}
>
{profiles.map((profile) => (
<OwnedCommercialProfileCard
isUpdating={updatingProfileId === profile.id}
key={profile.id}
onPress={() => {
router.push(
buddyServicesManageBusinessRoute(profile.id),
);
}}
onTogglePublication={() => {
openPublicationModal(profile);
}}
profile={profile}
/>
))}
</View>
)}

<TouchableOpacity
accessibilityHint={
'La creación requiere un contrato real del backend.'
}
accessibilityLabel="Crear un negocio"
accessibilityRole="button"
activeOpacity={0.82}
onPress={() => {
router.push(
buddyServicesCreateBusinessRoute(),
);
}}
style={{
alignItems: 'center',
backgroundColor: '#7427D5',
borderRadius: 15,
flexDirection: 'row',
justifyContent: 'center',
marginTop: 22,
minHeight: 50,
paddingHorizontal: 18,
}}
>
<Plus
color="#FFFFFF"
size={20}
/>

<Text
style={{
color: '#FFFFFF',
fontSize: 15,
fontWeight: '800',
marginLeft: 8,
}}
>
Crear negocio
</Text>
</TouchableOpacity>
</ScrollView>
)}

<Modal
animationType="fade"
onRequestClose={closePublicationModal}
transparent
visible={Boolean(selectedProfile)}
>
<View
style={{
backgroundColor: 'rgba(38, 23, 67, 0.48)',
flex: 1,
justifyContent: 'flex-end',
}}
>
<View
style={{
backgroundColor: '#FFFCF9',
borderTopLeftRadius: 28,
borderTopRightRadius: 28,
paddingBottom: 30,
paddingHorizontal: 20,
paddingTop: 18,
}}
>
<View
style={{
alignItems: 'center',
flexDirection: 'row',
justifyContent: 'space-between',
}}
>
<View
style={{
alignItems: 'center',
backgroundColor: (selectedIsArchived || selectedIsPaused)
? '#E9F7EE'
: '#FFF0F0',
borderRadius: 14,
height: 44,
justifyContent: 'center',
width: 44,
}}
>
{selectedIsArchived || selectedIsPaused ? (
<Play
color="#177245"
size={22}
/>
) : (
<Power
color="#B42318"
size={22}
/>
)}
</View>

<TouchableOpacity
accessibilityLabel="Cerrar"
accessibilityRole="button"
disabled={isSubmittingPublication}
onPress={closePublicationModal}
style={{
alignItems: 'center',
backgroundColor: '#F4EDF9',
borderRadius: 14,
height: 40,
justifyContent: 'center',
width: 40,
}}
>
<X
color="#3D245E"
size={20}
/>
</TouchableOpacity>
</View>

<Text
style={{
color: '#261743',
fontSize: 21,
fontWeight: '900',
marginTop: 18,
}}
>
{selectedIsArchived
? '¿Restaurar este negocio?'
: selectedIsPaused
? '¿Activar este negocio?'
: '¿Desactivar este negocio?'}
</Text>

<Text
style={{
color: '#786593',
fontSize: 14,
lineHeight: 21,
marginTop: 8,
}}
>
{selectedIsArchived
? (
`${selectedProfile?.display_name || 'Este negocio'} `
+ 'se restaurará como pausado. No será visible '
+ 'para clientes hasta que lo publiques.'
)
: selectedIsPaused
? (
`${selectedProfile?.display_name || 'Este negocio'} `
+ 'volverá a estar publicado y disponible '
+ 'para clientes.'
)
: (
`${selectedProfile?.display_name || 'Este negocio'} `
+ 'dejará de estar visible y disponible para '
+ 'clientes hasta que decidas activarlo de nuevo.'
)}
</Text>

{selectedIsDeactivation ? (
<>
<View
style={{
alignItems: 'center',
backgroundColor: '#FFF7E8',
borderColor: '#F7D99A',
borderRadius: 12,
borderWidth: 1,
flexDirection: 'row',
marginTop: 16,
padding: 12,
}}
>
<CircleAlert
color="#9A5B00"
size={18}
/>

<Text
style={{
color: '#7A4800',
flex: 1,
fontSize: 12,
lineHeight: 18,
marginLeft: 8,
}}
>
El motivo es obligatorio y quedará registrado.
</Text>
</View>

<Text
style={{
color: '#3D245E',
fontSize: 13,
fontWeight: '800',
marginBottom: 8,
marginTop: 18,
}}
>
Motivo de desactivación
</Text>

<TextInput
accessibilityLabel="Motivo de desactivación"
editable={!isSubmittingPublication}
maxLength={2000}
multiline
onChangeText={setArchiveReason}
placeholder="Ejemplo: Cierro temporalmente por vacaciones."
placeholderTextColor="#A99AB9"
style={{
backgroundColor: '#FFFFFF',
borderColor: '#D9CEE5',
borderRadius: 13,
borderWidth: 1,
color: '#261743',
fontSize: 14,
minHeight: 98,
padding: 13,
textAlignVertical: 'top',
}}
value={archiveReason}
/>
</>
) : null}

<View
style={{
flexDirection: 'row',
gap: 10,
marginTop: 22,
}}
>
<TouchableOpacity
accessibilityLabel="Cancelar cambio de estado"
accessibilityRole="button"
disabled={isSubmittingPublication}
onPress={closePublicationModal}
style={{
alignItems: 'center',
backgroundColor: '#F4EDF9',
borderRadius: 13,
flex: 1,
justifyContent: 'center',
minHeight: 48,
opacity: isSubmittingPublication ? 0.62 : 1,
}}
>
<Text
style={{
color: '#3D245E',
fontSize: 14,
fontWeight: '800',
}}
>
Cancelar
</Text>
</TouchableOpacity>

<TouchableOpacity
accessibilityLabel={
selectedIsArchived
? 'Confirmar restauración del negocio'
: selectedIsPaused
? 'Confirmar activación del negocio'
: 'Confirmar desactivación del negocio'
}
accessibilityRole="button"
disabled={isSubmittingPublication}
onPress={() => {
void submitPublicationChange();
}}
style={{
alignItems: 'center',
backgroundColor: (selectedIsArchived || selectedIsPaused)
? '#177245'
: '#B42318',
borderRadius: 13,
flex: 1,
flexDirection: 'row',
justifyContent: 'center',
minHeight: 48,
opacity: isSubmittingPublication ? 0.7 : 1,
}}
>
{isSubmittingPublication ? (
<ActivityIndicator
color="#FFFFFF"
size="small"
/>
) : null}

<Text
style={{
color: '#FFFFFF',
fontSize: 14,
fontWeight: '800',
marginLeft: isSubmittingPublication ? 8 : 0,
}}
>
{isSubmittingPublication
? 'Actualizando…'
: selectedIsArchived
? 'Sí, restaurar'
: selectedIsPaused
? 'Sí, activar'
: 'Sí, desactivar'}
</Text>
</TouchableOpacity>
</View>
</View>
</View>
</Modal>
</ScreenSafeArea>
);
}
