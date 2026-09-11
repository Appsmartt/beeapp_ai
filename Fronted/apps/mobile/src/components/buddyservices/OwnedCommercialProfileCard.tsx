import {
ActivityIndicator,
Text,
TouchableOpacity,
View,
} from 'react-native';
import {
ChevronRight,
CirclePause,
CircleX,
MapPin,
Play,
Power,
ShieldCheck,
Store,
} from 'lucide-react-native';

import type {
CommercialOwnedProfile,
} from '@beeapp/shared-types';

import CommercialLogoAvatar from './CommercialLogoAvatar';

interface OwnedCommercialProfileCardProps {
profile: CommercialOwnedProfile;
isUpdating?: boolean;
onPress: () => void;
onTogglePublication?: () => void;
}

function getPublicationCopy(
profile: CommercialOwnedProfile,
): {
label: string;
color: string;
Icon: typeof Store;
} {
if (profile.publication_status === 'published') {
return {
label: 'Publicado',
color: '#177245',
Icon: Store,
};
}

if (profile.publication_status === 'paused') {
return {
label: 'Pausado',
color: '#9A5B00',
Icon: CirclePause,
};
}

if (profile.publication_status === 'archived') {
return {
label: 'Desactivado',
color: '#6D6875',
Icon: CircleX,
};
}

return {
label: 'Suspendido',
color: '#B42318',
Icon: CircleX,
};
}

function getVerificationCopy(
profile: CommercialOwnedProfile,
): string {
if (profile.verification_status === 'verified') {
return 'Verificado';
}

if (profile.verification_status === 'pending_review') {
return 'Verificación en revisión';
}

if (profile.verification_status === 'requires_correction') {
return 'Verificación requiere corrección';
}

if (profile.verification_status === 'rejected') {
return 'Verificación rechazada';
}

if (profile.verification_status === 'suspended') {
return 'Verificación suspendida';
}

return 'Sin verificación solicitada';
}

export default function OwnedCommercialProfileCard({
profile,
isUpdating = false,
onPress,
onTogglePublication,
}: OwnedCommercialProfileCardProps) {
const publication = getPublicationCopy(profile);
const PublicationIcon = publication.Icon;
const isArchived = profile.publication_status === 'archived';
const isPaused = profile.publication_status === 'paused';
const isSuspended = profile.publication_status === 'suspended';
const canTogglePublication = Boolean(
onTogglePublication && !isSuspended,
);
const actionLabel = isArchived
? 'Restaurar negocio'
: isPaused
? 'Activar negocio'
: 'Desactivar negocio';
const actionHint = isArchived
? 'Restaura el negocio como pausado'
: isPaused
? 'Publica el negocio y lo habilita para clientes'
: 'Desactiva el negocio y lo oculta para clientes';
const ActionIcon = (isArchived || isPaused) ? Play : Power;
const actionColor = (isArchived || isPaused)
? '#177245'
: '#B42318';
const actionBackground = (isArchived || isPaused)
? '#E9F7EE'
: '#FFF0F0';
const actionBorder = (isArchived || isPaused)
? '#B7E4C7'
: '#F5C2C7';

return (
<View
style={{
backgroundColor: '#FFFFFF',
borderColor: isArchived ? '#D9D2DF' : '#E7DDF2',
borderRadius: 18,
borderWidth: 1,
marginBottom: 12,
overflow: 'hidden',
}}
>
<TouchableOpacity
accessibilityHint="Abre la administración de este negocio"
accessibilityLabel={`Gestionar ${profile.display_name}`}
accessibilityRole="button"
activeOpacity={0.82}
onPress={onPress}
style={{
paddingHorizontal: 16,
paddingTop: 16,
}}
>
<View
style={{
alignItems: 'center',
flexDirection: 'row',
}}
>
<CommercialLogoAvatar
displayName={profile.display_name}
logoFileId={profile.logo_file_id}
size={56}
/>

<View
style={{
flex: 1,
marginLeft: 12,
minWidth: 0,
}}
>
<Text
numberOfLines={2}
style={{
color: '#261743',
fontSize: 17,
fontWeight: '800',
}}
>
{profile.display_name}
</Text>

<Text
numberOfLines={2}
style={{
color: '#786593',
fontSize: 13,
lineHeight: 19,
marginTop: 5,
}}
>
{profile.description}
</Text>
</View>

<ChevronRight
color="#8D7BA3"
size={21}
/>
</View>

<View
style={{
alignItems: 'center',
flexDirection: 'row',
marginTop: 12,
}}
>
<MapPin
color="#786593"
size={15}
/>

<Text
style={{
color: '#786593',
fontSize: 12,
marginLeft: 5,
}}
>
{`${profile.city}, ${profile.country_code}`}
</Text>
</View>

<View
style={{
flexDirection: 'row',
flexWrap: 'wrap',
gap: 8,
marginTop: 14,
}}
>
<View
style={{
alignItems: 'center',
backgroundColor: `${publication.color}14`,
borderRadius: 99,
flexDirection: 'row',
paddingHorizontal: 9,
paddingVertical: 5,
}}
>
<PublicationIcon
color={publication.color}
size={13}
/>

<Text
style={{
color: publication.color,
fontSize: 11,
fontWeight: '700',
marginLeft: 5,
}}
>
{publication.label}
</Text>
</View>

<View
style={{
alignItems: 'center',
backgroundColor: '#F4F0F8',
borderRadius: 99,
flexDirection: 'row',
paddingHorizontal: 9,
paddingVertical: 5,
}}
>
<ShieldCheck
color="#6A4B91"
size={13}
/>

<Text
style={{
color: '#6A4B91',
fontSize: 11,
fontWeight: '700',
marginLeft: 5,
}}
>
{getVerificationCopy(profile)}
</Text>
</View>
</View>

<Text
style={{
color: profile.is_available
? '#177245'
: '#9A5B00',
fontSize: 12,
fontWeight: '700',
marginBottom: 16,
marginTop: 13,
}}
>
{profile.is_available
? 'Disponible para clientes'
: 'No disponible para clientes'}
</Text>
</TouchableOpacity>

{isSuspended ? (
<View
style={{
backgroundColor: '#FFF4F2',
borderTopColor: '#F5C2C7',
borderTopWidth: 1,
paddingHorizontal: 16,
paddingVertical: 12,
}}
>
<Text
style={{
color: '#B42318',
fontSize: 12,
fontWeight: '700',
}}
>
Este negocio está suspendido y no puede cambiarse desde aquí.
</Text>
</View>
) : canTogglePublication ? (
<View
style={{
borderTopColor: '#EEE7F4',
borderTopWidth: 1,
padding: 12,
}}
>
<TouchableOpacity
accessibilityHint={actionHint}
accessibilityLabel={`${actionLabel}: ${profile.display_name}`}
accessibilityRole="button"
activeOpacity={0.82}
disabled={isUpdating}
onPress={onTogglePublication}
style={{
alignItems: 'center',
backgroundColor: actionBackground,
borderColor: actionBorder,
borderRadius: 12,
borderWidth: 1,
flexDirection: 'row',
justifyContent: 'center',
minHeight: 44,
opacity: isUpdating ? 0.62 : 1,
paddingHorizontal: 14,
}}
>
{isUpdating ? (
<ActivityIndicator
color={actionColor}
size="small"
/>
) : (
<ActionIcon
color={actionColor}
size={17}
/>
)}

<Text
style={{
color: actionColor,
fontSize: 13,
fontWeight: '800',
marginLeft: 8,
}}
>
{isUpdating
? 'Actualizando estado…'
: actionLabel}
</Text>
</TouchableOpacity>
</View>
) : null}
</View>
);
}
