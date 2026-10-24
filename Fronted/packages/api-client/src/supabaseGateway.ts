import type { SupabaseClient } from '@supabase/supabase-js';

import {
    buildAssistantChatConversation,
    handleAssistant,
    mergeAssistantInboxPreference,
} from './gateway/assistant';
import { handleCalendar } from './gateway/calendar';
import { handleCommercial } from './gateway/commercial';
import {
    handleIntegrations,
    handleMail,
    } from './gateway/mail';
import { handleNotes } from './gateway/notes';
import {
    asJson,
    asRows,
    GatewayError,
    type Json,
    pathOf,
    queryOf,
    requireClient,
    SIGNED_URL_SECONDS,
    signedUrlsForFileIds,
    unwrap,
    } from './gateway/runtime';
import { mapStorageFile as mapStoredFile } from './gateway/storage';
import { handleStorage } from './gateway/storage';
import { dispatchUpload as uploadThroughSupabase } from './gateway/uploads';
import {
    mapStatusRowToStory,
    statusBackgroundRecord,
    statusLayersWithFileIds,
    } from './gateway/statusStories';
import {
    getSupabase,
    mapAuthSession,
    } from './supabase';

export { GatewayError };

function isDeviceConflict(message: string): boolean {
    return /duplicate key|session_token_hash|unique constraint|devices_user_auth/i
        .test(message);
}

function friendlyAuthError(message: string, fallback: string): string {
    const text = message.trim();

    if (/already registered|already been registered|user already exists/i.test(text)) {
        return 'Ya existe una cuenta con ese correo.';
    }

    if (/password/i.test(text) && /weak|short|at least|least \d+/i.test(text)) {
        return 'La contraseña no cumple los requisitos de seguridad.';
    }

    if (/invalid email|unable to validate email address/i.test(text)) {
        return 'El correo electrónico no es válido.';
    }

    if (/invalid login credentials/i.test(text)) {
        return 'Correo o contraseña incorrectos.';
    }

    if (/email not confirmed/i.test(text)) {
        return 'Confirma tu correo antes de iniciar sesión.';
    }

    if (isDeviceConflict(text)) {
        return 'No fue posible registrar este dispositivo. Inténtalo de nuevo.';
    }

    if (/sesión no válida/i.test(text)) {
        return 'La sesión no es válida. Vuelve a iniciar sesión.';
    }

    return text || fallback;
}

function friendlyOtpSmsError(message: string, fallback: string): string {
    const text = message.trim();

    if (
        /21608|Primary Compliance Profile|unverified numbers|verified caller IDs/i
            .test(text)
    ) {
        return (
            'El envío de SMS aún no está habilitado para todos los números. '
            + 'Usa correo para iniciar sesión o inténtalo más tarde.'
        );
    }

    if (/Error sending confirmation OTP to provider/i.test(text)) {
        return (
            'No pudimos enviar el SMS. Revisa el número, usa correo '
            + 'o inténtalo de nuevo en unos minutos.'
        );
    }

    if (/sms send rate limit|too many requests|over sms send rate limit/i.test(text)) {
        return 'Demasiados intentos. Espera un momento antes de pedir otro código.';
    }

    if (/invalid phone|phone number is invalid|unable to parse phone/i.test(text)) {
        return 'El número de celular no es válido. Revisa el indicativo y el número.';
    }

    if (/otp_expired|token has expired|expired/i.test(text)) {
        return 'El código expiró. Solicita uno nuevo.';
    }

    if (/invalid otp|invalid token|token is invalid/i.test(text)) {
        return 'El código no es válido. Revísalo e inténtalo de nuevo.';
    }

    const generic = friendlyAuthError(text, fallback);
    if (generic !== text) {
        return generic;
    }

    if (text.length > 120 || /twilio\.com|console\.twilio/i.test(text)) {
        return fallback;
    }

    return text || fallback;
}

async function findActiveDeviceId(
    supabase: SupabaseClient,
    userId: string,
    deviceType: string,
): Promise<string | null> {
    const { data } = await supabase
        .from('devices')
        .select('id')
        .eq('user_id', userId)
        .eq('device_type', deviceType.toUpperCase())
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return data?.id ? String(data.id) : null;
}

async function registerDevice(
    supabase: SupabaseClient,
    registration: {
        userId?: string;
        deviceType?: string;
        platform?: string;
        deviceName?: string;
        userAgent?: string;
    } = {},
): Promise<string> {
    const deviceType = registration.deviceType || 'MOBILE';
    const args = {
        p_device_name: registration.deviceName || 'Buddy AI',
        p_platform: registration.platform || 'android',
        p_device_type: deviceType,
        p_user_agent: registration.userAgent || 'buddy-ai-mobile',
    };

    let { data, error } = await supabase.rpc(
        'register_device_session',
        args,
    );

    if (error && isDeviceConflict(error.message)) {
        const retry = await supabase.rpc('register_device_session', args);
        data = retry.data;
        error = retry.error;
    }

    if (error && isDeviceConflict(error.message) && registration.userId) {
        const existing = await findActiveDeviceId(
            supabase,
            registration.userId,
            deviceType,
        );

        if (existing) {
            return existing;
        }
    }

    if (error || !data) {
        throw new GatewayError(
            friendlyAuthError(
                error?.message || '',
                'No fue posible registrar el dispositivo.',
            ),
            400,
        );
    }

    return String(data);
}

const PROFILE_VERIFICATION_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function profileText(value: unknown): string {
    return String(value ?? '').trim();
}

function pendingProfileVerificationRequirements(
    profile: Json,
    businesses: Json[],
): string[] {
    const pending: string[] = [];

    if (
        !profileText(profile.first_name)
        || !profileText(profile.last_name)
        || !profileText(profile.occupation)
        || !profile.avatar_file_id
    ) {
        pending.push('perfil_completo');
    }

    if (!profileText(profile.phone_number)) {
        pending.push('celular');
    }

    const hasBusiness = businesses.some((business) => (
        profileText(business.display_name)
        && (
            profileText(business.custom_activity_text)
            || profileText(business.description)
        )
    ));

    if (!hasBusiness) {
        pending.push('empresa');
    }

    const request = asJson(asJson(profile.settings).verification_request);
    if (!profileText(request.document_file_id)) {
        pending.push('documento');
    }

    const createdAt = Date.parse(String(profile.created_at || ''));
    if (
        !Number.isFinite(createdAt)
        || Date.now() - createdAt < PROFILE_VERIFICATION_MIN_AGE_MS
    ) {
        pending.push('antiguedad');
    }

    return pending;
}

async function loadProfile(
    supabase: SupabaseClient,
    userId: string,
) {
    const profile = unwrap(await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single());
    const links = Array.isArray(profile.social_links)
        ? profile.social_links
        : [];
    const avatarUrls = await signedUrlsForFileIds(
        supabase,
        [profile.avatar_file_id],
    );

    return {
        ...profile,
        social_links: links,
        avatar_url: profile.avatar_file_id
            ? avatarUrls.get(String(profile.avatar_file_id)) ?? null
            : null,
    };
}

function normalizeInboxRow(row: Json): Json {
    const conversation = { ...row };
    conversation.id = String(
        conversation.conversation_id
        || conversation.id
        || '',
    );
    if (conversation.group_name != null) {
        conversation.name = conversation.group_name;
    }
    if (conversation.group_description != null) {
        conversation.description = conversation.group_description;
    }
    if (conversation.group_image_file_id != null) {
        conversation.image_file_id = conversation.group_image_file_id;
    }
    return conversation;
}

/** Inbox DB kind → API type. Business chats are 1:1 with a local, not multi-member groups. */
function mapConversationKindToType(
    kind: unknown,
): 'direct' | 'group' | 'ai' {
    const value = String(kind || '').toLowerCase();
    if (value === 'ai') {
        return 'ai';
    }
    if (value === 'group') {
        return 'group';
    }
    return 'direct';
}

async function handleQrLogin(
    method: string,
    path: string,
    body: unknown,
): Promise<unknown> {
    const supabase = getSupabase();
    const payload = asJson(body);

    if (method === 'POST' && path === '/accounts/qr-login/challenges/') {
        const created = await supabase.functions.invoke('qr-login', {
            body: { action: 'create' },
        });
        if (created.error || !created.data) {
            throw new GatewayError(created.error?.message || 'No fue posible crear el código.', 400);
        }
        return created.data;
    }

    const statusMatch = path.match(/^\/accounts\/qr-login\/challenges\/([^/]+)\/$/i);
    if (method === 'GET' && statusMatch) {
        const status = await supabase.functions.invoke('qr-login', {
            body: {
                action: 'status',
                challenge_token: decodeURIComponent(statusMatch[1]),
            },
        });
        if (status.error || !status.data) {
            throw new GatewayError(status.error?.message || 'No encontramos el código.', 404);
        }
        return status.data;
    }

    if (method === 'POST' && path === '/accounts/qr-login/scan/') {
        const scanned = await supabase.functions.invoke('qr-login', {
            body: {
                action: 'scan',
                challenge_token: payload.challenge_token,
            },
        });
        if (scanned.error || !scanned.data) {
            throw new GatewayError(scanned.error?.message || 'No fue posible aprobar el acceso.', 400);
        }
        return scanned.data;
    }

    throw new GatewayError(`Ruta de acceso QR no disponible: ${path}`, 501);
}

async function handleAccounts(
    method: string,
    path: string,
    body: unknown,
): Promise<unknown> {
    const supabase = getSupabase();
    const payload = asJson(body);

    if (method === 'POST' && path === '/accounts/login/') {
        const signed = await supabase.auth.signInWithPassword({
            email: String(payload.email || ''),
            password: String(payload.password || ''),
        });

        if (signed.error || !signed.data.session || !signed.data.user) {
            throw new GatewayError(
                friendlyAuthError(
                    signed.error?.message || '',
                    'No fue posible iniciar sesión.',
                ),
                401,
            );
        }

        const deviceSessionId = await registerDevice(supabase, {
            userId: signed.data.user.id,
            deviceType: String(payload.device_type || 'MOBILE'),
            platform: String(payload.platform || 'android'),
            deviceName: String(payload.device_name || 'Buddy AI'),
            userAgent: String(
                payload.user_agent || 'buddy-ai-mobile',
            ),
        });

        const profileRow = await supabase
            .from('profiles')
            .select('role, first_name, last_name')
            .eq('id', signed.data.user.id)
            .maybeSingle();

        return {
            message: 'Sesión iniciada.',
            session: mapAuthSession(signed.data.session),
            user: {
                id: signed.data.user.id,
                email: signed.data.user.email ?? null,
                phone: signed.data.user.phone ?? null,
                first_name: profileRow.data?.first_name ?? '',
                last_name: profileRow.data?.last_name ?? '',
                role: profileRow.data?.role ?? 'USER',
            },
            device_session_id: deviceSessionId,
        };
    }

    if (method === 'POST' && path === '/accounts/register/') {
        const signed = await supabase.auth.signUp({
            email: String(payload.email || ''),
            password: String(payload.password || ''),
            options: {
                data: {
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    phone_dial_code: payload.phone_dial_code,
                    phone_number: payload.phone_number,
                },
            },
        });

        if (signed.error || !signed.data.user) {
            throw new GatewayError(
                friendlyAuthError(
                    signed.error?.message || '',
                    'No fue posible crear la cuenta.',
                ),
                400,
            );
        }

        const createdSession = signed.data.session
            ? mapAuthSession(signed.data.session)
            : null;

        return {
            message: createdSession
                ? 'Cuenta creada.'
                : 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.',
            session: createdSession,
            user: {
                id: signed.data.user.id,
                email: signed.data.user.email || String(payload.email),
                phone: signed.data.user.phone,
                first_name: String(payload.first_name || ''),
                last_name: String(payload.last_name || ''),
                phone_dial_code: String(payload.phone_dial_code || ''),
                phone_number: String(payload.phone_number || ''),
                role: 'USER',
            },
        };
    }

    if (method === 'POST' && path === '/accounts/session/refresh/') {
        const refreshed = await supabase.auth.refreshSession({
            refresh_token: String(
                payload.refresh_token
                || payload.session_token
                || '',
            ),
        });

        if (refreshed.error || !refreshed.data.session) {
            throw new GatewayError(
                refreshed.error?.message || 'No fue posible renovar la sesión.',
                401,
            );
        }

        return {
            session: mapAuthSession(refreshed.data.session),
        };
    }

    if (method === 'POST' && path === '/accounts/login/phone/request-otp/') {
        const { error } = await supabase.auth.signInWithOtp({
            phone: String(payload.phone || ''),
        });

        if (error) {
            throw new GatewayError(
                friendlyOtpSmsError(
                    error.message,
                    'No pudimos enviar el código por SMS.',
                ),
                400,
            );
        }

        return { message: 'Enviamos un código por SMS.' };
    }

    if (
        method === 'POST'
        && path === '/accounts/login/phone/verify-otp/mobile/'
    ) {
        const verified = await supabase.auth.verifyOtp({
            phone: String(payload.phone || ''),
            token: String(payload.code || ''),
            type: 'sms',
        });

        if (verified.error || !verified.data.session || !verified.data.user) {
            throw new GatewayError(
                friendlyOtpSmsError(
                    verified.error?.message || '',
                    'Código inválido.',
                ),
                401,
            );
        }

        const deviceSessionId = await registerDevice(supabase);
        const profile = await loadProfile(
            supabase,
            verified.data.user.id,
        );

        return {
            message: 'Sesión iniciada.',
            session: mapAuthSession(verified.data.session),
            user: {
                id: verified.data.user.id,
                email: verified.data.user.email ?? null,
                phone: verified.data.user.phone ?? null,
                first_name: profile.first_name,
                last_name: profile.last_name,
                role: profile.role,
            },
            device_session_id: deviceSessionId,
        };
    }

    if (method === 'POST' && path === '/accounts/password-reset/request/') {
        const { error } = await supabase.auth.signInWithOtp({
            phone: String(payload.phone || ''),
        });

        if (error) {
            throw new GatewayError(
                friendlyOtpSmsError(
                    error.message,
                    'No pudimos enviar el código por SMS.',
                ),
                400,
            );
        }

        return { message: 'Enviamos un código para restablecer la contraseña.' };
    }

    if (method === 'POST' && path === '/accounts/password-reset/verify/') {
        const verified = await supabase.auth.verifyOtp({
            phone: String(payload.phone || ''),
            token: String(payload.code || ''),
            type: 'sms',
        });

        if (verified.error || !verified.data.session) {
            throw new GatewayError(
                friendlyOtpSmsError(
                    verified.error?.message || '',
                    'Código inválido.',
                ),
                401,
            );
        }

        return {
            message: 'Código verificado.',
            reset_token: verified.data.session.access_token,
        };
    }

    if (method === 'POST' && path === '/accounts/password-reset/confirm/') {
        if (payload.new_password !== payload.confirm_password) {
            throw new GatewayError('Las contraseñas no coinciden.', 400);
        }

        const updated = await supabase.auth.updateUser({
            password: String(payload.new_password || ''),
        });

        if (updated.error) {
            throw new GatewayError(updated.error.message, 400);
        }

        return { message: 'Contraseña actualizada.' };
    }

    if (path.startsWith('/accounts/qr-login/')) {
        return handleQrLogin(method, path, body);
    }

    const { supabase: authed, userId } = await requireClient();

    if (method === 'GET' && path === '/accounts/me/') {
        return {
            profile: await loadProfile(authed, userId),
        };
    }

    if (method === 'PATCH' && (
        path === '/accounts/me/profile/'
        || path === '/accounts/me/assistant/'
        || path === '/accounts/me/avatar/'
    )) {
        const patch: Json = {};
        for (const key of [
            'first_name',
            'last_name',
            'email',
            'phone_dial_code',
            'phone_number',
            'occupation',
            'location',
            'assistant_name',
            'assistant_tone',
            'avatar_file_id',
        ]) {
            if (key in payload) {
                patch[key] = payload[key];
            }
        }

        if (Array.isArray(payload.social_links)) {
            patch.social_links = payload.social_links;
        }

        if (Object.keys(patch).length > 0) {
            unwrap(await authed
                .from('profiles')
                .update(patch)
                .eq('id', userId));
        }

        if (patch.assistant_name || patch.assistant_tone) {
            const settingsPatch: Json = { updated_at: new Date().toISOString() };
            if (patch.assistant_name) {
                settingsPatch.name = String(patch.assistant_name).trim().slice(0, 40) || 'Buddy AI';
            }
            if (patch.assistant_tone) {
                const tone = String(patch.assistant_tone).toLowerCase();
                settingsPatch.tone = ['formal', 'profesional', 'professional'].includes(tone)
                    ? 'formal'
                    : ['cercano', 'amigable', 'friendly'].includes(tone)
                        ? 'cercano'
                        : 'neutro';
            }
            const existing = unwrap(await authed
                .from('assistant_settings')
                .select('user_id')
                .eq('user_id', userId)
                .maybeSingle());
            if (existing) {
                unwrap(await authed
                    .from('assistant_settings')
                    .update(settingsPatch)
                    .eq('user_id', userId));
            } else {
                unwrap(await authed
                    .from('assistant_settings')
                    .insert({ user_id: userId, ...settingsPatch }));
            }
        }

        return {
            message: 'Perfil actualizado.',
            profile: await loadProfile(authed, userId),
        };
    }

    if (method === 'POST' && path === '/accounts/me/verification/submit/') {
        const current = unwrap(await authed
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()) as Json;
        const status = profileText(current.verification_status) || 'no_solicitado';

        if (status === 'en_revision') {
            throw new GatewayError(
                'Ya tienes una solicitud de verificación en revisión.',
                409,
            );
        }

        if (status === 'verificado') {
            throw new GatewayError(
                'Tu cuenta ya está verificada.',
                409,
            );
        }

        const businesses = unwrap(await authed
            .from('businesses')
            .select('display_name, custom_activity_text, description')
            .eq('owner_id', userId)) as Json[] | null;
        const pendingRequirements = pendingProfileVerificationRequirements(
            current,
            businesses ?? [],
        );
        const submittedAt = new Date().toISOString();
        const settings = asJson(current.settings);

        unwrap(await authed
            .from('profiles')
            .update({
                verification_status: 'en_revision',
                settings: {
                    ...settings,
                    verification_request: {
                        ...asJson(settings.verification_request),
                        submitted_at: submittedAt,
                        status: 'en_revision',
                        pending_requirements: pendingRequirements,
                    },
                },
            })
            .eq('id', userId));

        await authed
            .from('notifications')
            .insert({
                user_id: userId,
                title: 'Solicitud de verificación recibida',
                body: 'Recibimos tu solicitud de Buddy Verify. La revisión es manual y tarda hasta 48 horas hábiles.',
                kind: 'profile_verification',
                data: {
                    status: 'en_revision',
                    submitted_at: submittedAt,
                },
            });

        return {
            message: 'Solicitud de verificación enviada.',
            profile: await loadProfile(authed, userId),
        };
    }

    if (method === 'DELETE' && path === '/accounts/me/avatar/') {
        unwrap(await authed
            .from('profiles')
            .update({ avatar_file_id: null })
            .eq('id', userId));

        return {
            message: 'Foto eliminada.',
            profile: await loadProfile(authed, userId),
        };
    }

    if (method === 'GET' && path === '/accounts/me/devices/') {
        const devices = unwrap(await authed
            .from('devices')
            .select('id, device_name, device_type, platform, browser, last_seen_at, created_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('last_seen_at', { ascending: false })) ?? [];

        return { devices };
    }

    const deviceMatch = path.match(
        /^\/accounts\/me\/devices\/([0-9a-f-]{36})\/$/i,
    );

    if (method === 'DELETE' && deviceMatch) {
        unwrap(await authed
            .from('devices')
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
            })
            .eq('id', deviceMatch[1])
            .eq('user_id', userId));
        return undefined;
    }

    if (method === 'DELETE' && path === '/accounts/me/devices/others/') {
        unwrap(await authed
            .from('devices')
            .update({
                is_active: false,
                revoked_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('is_active', true)
            .neq('device_type', 'MOBILE'));
        return undefined;
    }

    if (method === 'GET' && path === '/accounts/me/security-pin/') {
        const configured = unwrap(await authed.rpc('security_pin_status'));
        return { configured: configured === true };
    }

    if (method === 'POST' && path === '/accounts/me/security-pin/configure/') {
        unwrap(await authed.rpc('configure_security_pin', {
            p_pin: String(payload.pin || ''),
        }));
        return { configured: true };
    }

    if (method === 'POST' && path === '/accounts/me/security-pin/verify/') {
        const verified = unwrap(await authed.rpc('verify_security_pin', {
            p_pin: String(payload.pin || ''),
        }));
        return { verified: verified === true };
    }

    if (method === 'POST' && path === '/accounts/me/security-pin/verify-password/') {
        const verified = unwrap(await authed.rpc('verify_security_pin_password', {
            p_password: String(payload.password || ''),
        }));
        return { verified: verified === true };
    }

    if (method === 'POST' && path === '/accounts/me/security-pin/replace/') {
        unwrap(await authed.rpc('replace_security_pin', {
            p_password: String(payload.password || ''),
            p_pin: String(payload.pin || ''),
        }));
        return { configured: true };
    }

    if (method === 'GET' && path === '/accounts/web-session/me/') {
        return { profile: await loadProfile(authed, userId) };
    }

    if (method === 'POST' && path === '/accounts/web-session/activate/') {
        const activated = await authed.functions.invoke('qr-login', {
            body: {
                action: 'activate',
                challenge_token: payload.challenge_token,
            },
        });
        const data = asJson(activated.data);
        const session = asJson(data.session);

        if (session.access_token && session.refresh_token) {
            await authed.auth.setSession({
                access_token: String(session.access_token),
                refresh_token: String(session.refresh_token),
            });
        } else if (activated.error) {
            throw new GatewayError(
                activated.error.message || 'No fue posible activar la sesión web.',
                400,
            );
        }

        return undefined;
    }

    if (method === 'POST' && path === '/accounts/web-session/logout/') {
        await authed.auth.signOut();
        return undefined;
    }

    throw new GatewayError(
        `Ruta de cuentas aún no disponible en Supabase: ${path}`,
        501,
    );
}




function mapMessage(row: Json | null): Json {
    const message = row || {};
    const attachments = asRows<Json>(message.attachments);
    const reactions = asRows<Json>(message.reactions);

    return {
        ...message,
        sender_identity_id: message.sender_id ?? null,
        sender_user_id: message.sender_id ?? null,
        message_type: message.kind || 'text',
        body: message.body ?? '',
        attachment_file_id: attachments[0]?.file_id ?? null,
        reference_type: null,
        reference_id: null,
        metadata: {},
        sequence_number: Number(message.seq || 0),
        attachments,
        reactions,
    };
}

function mapCallRow(row: Json): Json {
    const participants = asRows<Json>(row.participants);

    return {
        call: {
            id: row.id,
            conversation_id: row.conversation_id,
            call_type: row.kind === 'video' ? 'video' : 'voice',
            status: row.status,
            agora_channel_name: `call_${String(row.id || '').replace(/-/g, '')}`,
            conversation_type: 'direct',
            started_at: row.started_at ?? null,
            ended_at: row.ended_at ?? null,
        },
        participants: participants.map((item) => ({
            identity_id: item.identity_id || item.user_id,
            agora_uid: Number(item.agora_uid || 1),
            status: item.status || 'invited',
        })),
        can_end_call: true,
        can_kick_participants: false,
    };
}

async function loadIdentities(
    supabase: SupabaseClient,
    userId: string,
): Promise<Json[]> {
    const profile = (unwrap(await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_file_id, created_at, updated_at')
        .eq('id', userId)
        .single()) || {}) as Json;
    const businesses = unwrap(await supabase
        .from('businesses')
        .select('id, display_name, logo_file_id, is_available, created_at, updated_at')
        .eq('owner_id', userId)) ?? [];
    const personal: Json = {
        id: userId,
        identity_type: 'profile',
        profile_id: userId,
        commercial_profile_id: null,
        display_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Yo',
        avatar_file_id: profile.avatar_file_id,
        is_active: true,
        is_available: true,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
    };
    const commercial = (businesses as Json[]).map((business) => ({
        id: business.id,
        identity_type: 'commercial_profile',
        profile_id: null,
        commercial_profile_id: business.id,
        display_name: business.display_name,
        avatar_file_id: business.logo_file_id,
        is_active: true,
        is_available: business.is_available !== false,
        created_at: business.created_at,
        updated_at: business.updated_at,
    }));

    return [personal, ...commercial];
}

async function loadConversation(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
): Promise<Json> {
    const conversation = unwrap(await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single());
    const members = unwrap(await supabase
        .from('conversation_members')
        .select('id, conversation_id, user_id, role, status, joined_at, last_read_at, pinned, muted')
        .eq('conversation_id', conversationId)) ?? [];
    const profiles = members.length
        ? unwrap(await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_file_id')
            .in('id', members.map((member: Json) => member.user_id))) ?? []
        : [];
    const byId = new Map((profiles as Json[]).map((profile) => [String(profile.id), profile]));
    const participants = (members as Json[]).map((member) => {
        const profile = byId.get(String(member.user_id));
        return {
            id: member.id,
            conversation_id: conversationId,
            identity_id: member.user_id,
            role: member.role === 'owner' ? 'owner' : member.role,
            joined_at: member.joined_at,
            left_at: member.status === 'left' ? member.joined_at : null,
            removed_at: null,
            removed_by_identity_id: null,
            cleared_at: null,
            cleared_before_message_id: null,
            last_read_message_id: null,
            last_read_at: member.last_read_at,
            last_delivered_message_id: null,
            last_delivered_at: null,
            unread_count: 0,
            notifications_enabled: member.muted !== true,
            is_pinned: member.pinned === true,
            created_at: member.joined_at,
            updated_at: member.joined_at,
            identity: {
                id: member.user_id,
                identity_type: 'profile',
                profile_id: member.user_id,
                commercial_profile_id: null,
                display_name: profile
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Usuario',
                avatar_file_id: profile?.avatar_file_id ?? null,
                is_active: member.status === 'active',
                is_available: true,
            },
        };
    });
    const mine = participants.find((item) => item.identity_id === userId) || null;

    return {
        id: conversation.id,
        conversation_type: mapConversationKindToType(conversation.kind),
        direct_key: null,
        created_by_identity_id: conversation.owner_id,
        posting_identity_id: null,
        posting_policy: conversation.category || 'all',
        name: conversation.name,
        description: conversation.description,
        image_file_id: conversation.image_file_id,
        last_message_id: null,
        last_message_at: null,
        is_active: true,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        own_participant: mine,
        participants,
        permissions: {
            own_role: mine?.role ?? null,
            is_active_participant: mine?.identity.is_active === true,
            can_send_messages: mine?.identity.is_active === true,
            can_invite_members: mine?.role === 'owner' || mine?.role === 'admin',
            can_remove_members: mine?.role === 'owner' || mine?.role === 'admin',
            can_promote_members: mine?.role === 'owner',
            can_demote_admins: mine?.role === 'owner',
            can_update_group: mine?.role === 'owner' || mine?.role === 'admin',
            can_transfer_ownership: mine?.role === 'owner',
            can_deactivate_group: mine?.role === 'owner',
            can_leave_group: mine?.role !== 'owner',
        },
    };
}

async function inboxRows(
    supabase: SupabaseClient,
    limit: number,
): Promise<Json[]> {
    const raw = unwrap(await supabase.rpc('get_chat_inbox', {
        p_limit: limit,
    }));

    const conversations = asRows<Json>(raw).map((row) => {
        const normalized = normalizeInboxRow(row);
        return {
            ...normalized,
            conversation_type: mapConversationKindToType(
                normalized.conversation_type,
            ),
            other_identity_id: normalized.other_profile_id || null,
            other_identity_type: normalized.other_profile_id ? 'profile' : null,
            is_pinned: normalized.pinned === true,
            notifications_enabled: normalized.notifications_enabled !== false,
            other_logo_file_id: normalized.other_logo_file_id ?? null,
            avatar_url: null as string | null,
        };
    });
    const avatarUrls = await signedUrlsForFileIds(
        supabase,
        conversations.map((row) => row.other_logo_file_id),
    );

    return conversations.map((row) => ({
        ...row,
        avatar_url: row.other_logo_file_id
            ? avatarUrls.get(String(row.other_logo_file_id)) ?? null
            : null,
    }));
}

async function handleChat(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);

    if (
        (method === 'POST' && path === '/chat/bootstrap/')
        || (method === 'GET' && path === '/chat/identities/')
    ) {
        return { identities: await loadIdentities(supabase, userId) };
    }

    if (method === 'GET' && path === '/chat/inbox/') {
        const limit = Number(query.get('limit') || 50);
        const before = query.get('before_last_message_at');
        let conversations = await inboxRows(supabase, limit);
        if (before) {
            conversations = conversations.filter((row) => (
                String(row.last_message_at || '') < before
            ));
        }
        const pinned = before
            ? []
            : conversations.filter((row) => row.is_pinned === true);

        return {
            identity_id: query.get('identity_id') || userId,
            conversations,
            pinned_conversations: pinned,
            limit,
            next_before_last_message_at: conversations.length
                ? conversations[conversations.length - 1].last_message_at ?? null
                : null,
        };
    }

    if (method === 'GET' && path === '/chat/inbox/by-type/') {
        const limit = Number(query.get('limit') || 10);
        const kind = query.get('conversation_type') || 'direct';
        const conversations = (await inboxRows(supabase, 100))
            .filter((row) => row.conversation_type === kind && row.is_pinned !== true)
            .slice(0, limit);

        return {
            identity_id: query.get('identity_id') || userId,
            conversation_type: kind,
            conversations,
            limit,
            has_more: false,
            next_before_sort_at: null,
            next_before_id: null,
        };
    }

    if (method === 'GET' && path === '/chat/recipients/search/') {
        const term = query.get('q') || '';
        const limit = Number(query.get('limit') || 20);
        const rows = asRows<Json>(unwrap(await supabase.rpc(
            'search_beeapp_users_for_invitation',
            { p_query: term, p_limit: limit },
        )));

        return {
            query: term,
            limit,
            results: rows.map((row) => ({
                identity_id: row.user_id,
                display_name: row.display_name
                    || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
            })),
        };
    }

    const contactMatch = path.match(/^\/chat\/contacts\/([0-9a-f-]{36})\/profile\/$/i);
    if (method === 'GET' && contactMatch) {
        const profile = unwrap(await supabase
            .from('profiles')
            .select('id, first_name, last_name, occupation, location, avatar_file_id, social_links')
            .eq('id', contactMatch[1])
            .maybeSingle());
        if (!profile) {
            throw new GatewayError('No encontramos ese contacto.', 404);
        }

        return {
            contact: {
                identity_id: profile.id,
                identity_type: 'profile',
                profile_id: profile.id,
                commercial_profile_id: null,
                display_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                occupation: profile.occupation,
                location: profile.location,
                social_links: Array.isArray(profile.social_links) ? profile.social_links : [],
                avatar_file_id: profile.avatar_file_id,
                is_available: true,
            },
        };
    }

    if (method === 'POST' && path === '/chat/direct-conversations/') {
        const conversationId = String(unwrap(await supabase.rpc('create_direct_chat', {
            p_recipient_id: payload.recipient_identity_id,
        })));

        return {
            created: true,
            conversation: await loadConversation(supabase, conversationId, userId),
        };
    }

    if (method === 'POST' && path === '/chat/groups/') {
        const conversation = (unwrap(await supabase
            .from('conversations')
            .insert({
                kind: 'group',
                name: payload.name,
                description: payload.description ?? null,
                image_file_id: payload.image_file_id ?? null,
                category: payload.posting_policy ?? null,
                owner_id: userId,
            })
            .select('id')
            .single()) || {}) as Json;
        unwrap(await supabase.from('conversation_members').insert({
            conversation_id: conversation.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
        }));

        return {
            conversation: await loadConversation(supabase, String(conversation.id), userId),
        };
    }

    const groupMatch = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/$/i);
    if (groupMatch && method === 'PATCH') {
        const patch: Json = {};
        for (const key of ['name', 'description', 'image_file_id']) {
            if (key in payload) patch[key] = payload[key];
        }
        if (payload.posting_policy) patch.category = payload.posting_policy;
        if (Object.keys(patch).length > 0) {
            unwrap(await supabase
                .from('conversations')
                .update(patch)
                .eq('id', groupMatch[1]));
        }

        return {
            conversation: await loadConversation(supabase, groupMatch[1], userId),
        };
    }

    const inviteCreate = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/invites\/$/i);
    if (inviteCreate && method === 'POST') {
        const member = unwrap(await supabase
            .from('conversation_members')
            .insert({
                conversation_id: inviteCreate[1],
                user_id: payload.invited_identity_id,
                role: 'member',
                status: 'invited',
            })
            .select('*')
            .single());

        return {
            invite: {
                id: member.id,
                conversation_id: inviteCreate[1],
                invited_identity_id: payload.invited_identity_id,
                invited_by_identity_id: userId,
                status: 'pending',
                responded_at: null,
                expires_at: payload.expires_at ?? null,
                created_at: member.joined_at,
                updated_at: member.joined_at,
                conversation: await loadConversation(supabase, inviteCreate[1], userId),
                invited_identity: { id: payload.invited_identity_id, display_name: '' },
                invited_by_identity: { id: userId, display_name: '' },
            },
        };
    }

    if (method === 'GET' && path === '/chat/group-invites/') {
        const members = unwrap(await supabase
            .from('conversation_members')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'invited')) ?? [];

        return {
            invites: (members as Json[]).map((member) => ({
                id: member.id,
                conversation_id: member.conversation_id,
                invited_identity_id: userId,
                invited_by_identity_id: null,
                status: 'pending',
                responded_at: null,
                expires_at: null,
                created_at: member.joined_at,
                updated_at: member.joined_at,
            })),
            count: members.length,
            limit: Number(query.get('limit') || 50),
            offset: Number(query.get('offset') || 0),
        };
    }

    const inviteResponse = path.match(/^\/chat\/group-invites\/([0-9a-f-]{36})\/response\/$/i);
    if (inviteResponse && method === 'POST') {
        const status = payload.accept === false ? 'left' : 'active';
        const member = unwrap(await supabase
            .from('conversation_members')
            .update({ status })
            .eq('id', inviteResponse[1])
            .eq('user_id', userId)
            .select('*')
            .single());
        const conversation = status === 'active'
            ? await loadConversation(supabase, member.conversation_id, userId)
            : null;

        return {
            accepted: status === 'active',
            conversation,
            invite: {
                id: member.id,
                conversation_id: member.conversation_id,
                invited_identity_id: userId,
                invited_by_identity_id: null,
                status: status === 'active' ? 'accepted' : 'rejected',
                responded_at: new Date().toISOString(),
                expires_at: null,
                created_at: member.joined_at,
                updated_at: new Date().toISOString(),
            },
        };
    }

    const conversationMatch = path.match(/^\/chat\/conversations\/([0-9a-f-]{36})\/$/i);
    if (conversationMatch && method === 'GET') {
        return {
            conversation: await loadConversation(supabase, conversationMatch[1], userId),
        };
    }

    const participantsMatch = path.match(/^\/chat\/conversations\/([0-9a-f-]{36})\/participants\/$/i);
    if (participantsMatch && method === 'GET') {
        const conversation = await loadConversation(supabase, participantsMatch[1], userId);
        return { participants: conversation.participants };
    }

    const messagesMatch = path.match(/^\/chat\/conversations\/([0-9a-f-]{36})\/messages\/$/i);
    if (messagesMatch && method === 'GET') {
        const limit = Number(query.get('limit') || 50);
        const before = query.get('before_sequence');
        let request = supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', messagesMatch[1])
            .is('deleted_at', null)
            .order('seq', { ascending: false })
            .limit(limit);
        if (before) request = request.lt('seq', Number(before));
        const messages = (unwrap(await request) ?? []).map(mapMessage);

        return {
            conversation_id: messagesMatch[1],
            messages,
            limit,
            next_before_sequence: messages.length
                ? messages[messages.length - 1].sequence_number
                : null,
        };
    }

    if (messagesMatch && method === 'POST') {
        const attachments = payload.attachment_file_id
            ? [{ file_id: payload.attachment_file_id }]
            : [];
        const message = mapMessage(unwrap(await supabase
            .from('messages')
            .insert({
                conversation_id: messagesMatch[1],
                sender_id: userId,
                body: payload.body || '',
                kind: payload.message_type || 'text',
                attachments,
            })
            .select('*')
            .single()));

        return { message };
    }

    const messageMatch = path.match(/^\/chat\/messages\/([0-9a-f-]{36})\/$/i);
    if (messageMatch && method === 'GET') {
        return {
            message: mapMessage(unwrap(await supabase
                .from('messages')
                .select('*')
                .eq('id', messageMatch[1])
                .single())),
        };
    }

    const reactionMatch = path.match(/^\/chat\/messages\/([0-9a-f-]{36})\/reactions\/$/i);
    if (reactionMatch && method === 'POST') {
        const reaction = unwrap(await supabase.rpc('set_message_reaction', {
            p_message_id: reactionMatch[1],
            p_emoji: payload.emoji,
            p_remove: false,
        }));
        return { reaction };
    }

    const reactionDelete = path.match(/^\/chat\/messages\/([0-9a-f-]{36})\/reactions\/([^/]+)\/$/i);
    if (reactionDelete && method === 'DELETE') {
        unwrap(await supabase.rpc('set_message_reaction', {
            p_message_id: reactionDelete[1],
            p_emoji: decodeURIComponent(reactionDelete[2]),
            p_remove: true,
        }));
        return undefined;
    }

    const attachmentAccess = path.match(/^\/chat\/messages\/([0-9a-f-]{36})\/attachment\/access\/$/i);
    if (attachmentAccess && method === 'GET') {
        const message = (unwrap(await supabase
            .from('messages')
            .select('attachments')
            .eq('id', attachmentAccess[1])
            .single()) || {}) as Json;
        const fileId = asRows<Json>(message.attachments)[0]?.file_id;
        if (!fileId) throw new GatewayError('Este mensaje no tiene adjunto.', 404);
        const file = mapStoredFile(unwrap(await supabase
            .from('files')
            .select('*')
            .eq('id', fileId)
            .single()));
        const signed = await supabase.storage
            .from(String(file.bucket))
            .createSignedUrl(String(file.path), 1800);
        if (signed.error || !signed.data) {
            throw new GatewayError(signed.error?.message || 'No fue posible abrir el adjunto.', 400);
        }

        return {
            message_id: attachmentAccess[1],
            attachment: file,
            url: signed.data.signedUrl,
            expires_in_seconds: 1800,
            download: query.get('download') === 'true',
        };
    }

    const assistantConversationMatch = path.match(
        /^\/chat\/conversations\/assistant\/(pinned|notifications)\/$/i,
    );
    if (assistantConversationMatch && method === 'PATCH') {
        const action = assistantConversationMatch[1];
        const settings = await mergeAssistantInboxPreference(
            supabase,
            userId,
            action === 'pinned'
                ? { inbox_pinned: payload.is_pinned === true }
                : { inbox_muted: payload.notifications_enabled === false },
        );
        const isPinned = settings.inbox_pinned !== false;
        const notificationsEnabled = settings.inbox_muted !== true;
        return {
            conversation: buildAssistantChatConversation(
                settings,
                isPinned,
                notificationsEnabled,
            ),
        };
    }

    const readMatch = path.match(/^\/chat\/conversations\/([0-9a-f-]{36})\/(read|delivered|pinned|notifications|clear)\/$/i);
    if (readMatch) {
        const conversationId = readMatch[1];
        const action = readMatch[2];
        if (action === 'read' || action === 'delivered') {
            let seq = 0;
            if (payload.last_read_message_id) {
                const message = unwrap(await supabase
                    .from('messages')
                    .select('seq')
                    .eq('id', payload.last_read_message_id)
                    .maybeSingle());
                seq = Number(message?.seq || 0);
            }
            unwrap(await supabase
                .from('conversation_members')
                .update({
                    last_read_at: new Date().toISOString(),
                    last_read_seq: seq,
                })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId));
            return { marked: true };
        }
        if (action === 'pinned' || action === 'notifications') {
            const patch = action === 'pinned'
                ? { pinned: payload.is_pinned === true }
                : { muted: payload.notifications_enabled === false };
            unwrap(await supabase
                .from('conversation_members')
                .update(patch)
                .eq('conversation_id', conversationId)
                .eq('user_id', userId));
            return {
                conversation: await loadConversation(supabase, conversationId, userId),
            };
        }
        unwrap(await supabase
            .from('conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId));
        return undefined;
    }

    const transfer = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/transfer-ownership\/$/i);
    if (transfer && method === 'POST') {
        unwrap(await supabase.from('conversations').update({
            owner_id: payload.new_owner_identity_id,
        }).eq('id', transfer[1]));
        unwrap(await supabase.from('conversation_members').update({ role: 'member' })
            .eq('conversation_id', transfer[1]).eq('user_id', userId));
        unwrap(await supabase.from('conversation_members').update({ role: 'owner' })
            .eq('conversation_id', transfer[1]).eq('user_id', payload.new_owner_identity_id));
        return { conversation: await loadConversation(supabase, transfer[1], userId) };
    }

    const roleMatch = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/participants\/([0-9a-f-]{36})\/role\/$/i);
    if (roleMatch && method === 'PATCH') {
        unwrap(await supabase.from('conversation_members').update({
            role: payload.role === 'admin' ? 'admin' : 'member',
        }).eq('conversation_id', roleMatch[1]).eq('user_id', roleMatch[2]));
        return { conversation: await loadConversation(supabase, roleMatch[1], userId) };
    }

    const removeMember = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/participants\/([0-9a-f-]{36})\/$/i);
    if (removeMember && method === 'DELETE') {
        unwrap(await supabase.from('conversation_members').update({ status: 'left' })
            .eq('conversation_id', removeMember[1]).eq('user_id', removeMember[2]));
        return undefined;
    }

    const leaveGroup = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/leave\/$/i);
    if (leaveGroup && method === 'POST') {
        unwrap(await supabase.from('conversation_members').update({ status: 'left' })
            .eq('conversation_id', leaveGroup[1]).eq('user_id', userId));
        return undefined;
    }

    const deactivate = path.match(/^\/chat\/groups\/([0-9a-f-]{36})\/sole-owner\/$/i);
    if (deactivate && method === 'DELETE') {
        unwrap(await supabase.from('conversation_members').update({ status: 'left' })
            .eq('conversation_id', deactivate[1]));
        return undefined;
    }

    if (method === 'GET' && path === '/chat/categories/') {
        const categories = unwrap(await supabase
            .from('chat_categories')
            .select('id, name, icon, color, created_at')
            .eq('owner_id', userId)
            .order('created_at', { ascending: true })) ?? [];

        return { categories };
    }

    if (method === 'POST' && path === '/chat/categories/') {
        const name = String(payload.name || '').trim();

        if (!name || name.length > 40) {
            throw new GatewayError(
                'Escribe un nombre de categoría de hasta 40 caracteres.',
                400,
            );
        }

        const category = unwrap(await supabase
            .from('chat_categories')
            .insert({
                owner_id: userId,
                name,
                icon: String(payload.icon || 'Users').trim().slice(0, 40) || 'Users',
                color: String(payload.color || '#6025D2').trim().slice(0, 20) || '#6025D2',
            })
            .select('id, name, icon, color, created_at')
            .single());

        return { category };
    }

    if (method === 'GET' && path === '/chat/categories/assignments/') {
        const conversationIds = query
            .getAll('conversation_id')
            .map((id) => id.trim())
            .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
            .slice(0, 100);

        if (conversationIds.length === 0) {
            return { assignments: [] };
        }

        const assignments = unwrap(await supabase
            .from('chat_category_assignments')
            .select('conversation_id, category_id')
            .eq('owner_id', userId)
            .in('conversation_id', conversationIds)) ?? [];

        return { assignments };
    }

    const categoryDelete = path.match(/^\/chat\/categories\/([0-9a-f-]{36})\/$/i);
    if (method === 'DELETE' && categoryDelete) {
        unwrap(await supabase
            .from('chat_categories')
            .delete()
            .eq('id', categoryDelete[1])
            .eq('owner_id', userId));
        return undefined;
    }

    const conversationCategories = path.match(
        /^\/chat\/conversations\/([0-9a-f-]{36})\/categories\/$/i,
    );
    if (method === 'PUT' && conversationCategories) {
        const conversationId = conversationCategories[1];
        const requestedIds = Array.isArray(payload.category_ids)
            ? payload.category_ids
                .map((id) => String(id || '').trim())
                .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
            : [];
        const categoryIds = Array.from(new Set(requestedIds));
        const membership = unwrap(await supabase
            .from('conversation_members')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle());

        if (!membership) {
            throw new GatewayError('No perteneces a esa conversación.', 403);
        }

        if (categoryIds.length > 0) {
            const owned = unwrap(await supabase
                .from('chat_categories')
                .select('id')
                .eq('owner_id', userId)
                .in('id', categoryIds)) ?? [];

            if (owned.length !== categoryIds.length) {
                throw new GatewayError(
                    'Alguna categoría no te pertenece.',
                    400,
                );
            }
        }

        unwrap(await supabase
            .from('chat_category_assignments')
            .delete()
            .eq('owner_id', userId)
            .eq('conversation_id', conversationId));

        if (categoryIds.length > 0) {
            unwrap(await supabase
                .from('chat_category_assignments')
                .insert(categoryIds.map((categoryId) => ({
                    category_id: categoryId,
                    conversation_id: conversationId,
                    owner_id: userId,
                }))));
        }

        return { category_ids: categoryIds };
    }

    if (method === 'GET' && path === '/chat/pin-protections/') {
        const rows = unwrap(await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .not('pin_hash', 'is', null)) ?? [];

        return {
            conversation_ids: rows.map((row) => row.conversation_id),
        };
    }

    const pinProtection = path.match(
        /^\/chat\/conversations\/([0-9a-f-]{36})\/pin-protection\/$/i,
    );
    if (pinProtection && method === 'GET') {
        const row = unwrap(await supabase
            .from('conversation_members')
            .select('pin_hash')
            .eq('conversation_id', pinProtection[1])
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle());

        return { protected: Boolean(row?.pin_hash) };
    }

    if (pinProtection && method === 'POST') {
        unwrap(await supabase.rpc('chat_set_pin_protection', {
            p_conversation_id: pinProtection[1],
        }));
        return { protected: true };
    }

    if (pinProtection && method === 'DELETE') {
        unwrap(await supabase.rpc('chat_remove_pin_protection', {
            p_conversation_id: pinProtection[1],
            p_pin: String(payload.pin || ''),
        }));
        return { protected: false };
    }

    if (method === 'POST' && path === '/chat/presence/state/') {
        const online = payload.online === true;
        const now = new Date();
        unwrap(await supabase
            .from('chat_presence')
            .upsert({
                user_id: userId,
                online,
                expires_at: new Date(now.getTime() + (online ? 90_000 : 0)).toISOString(),
                updated_at: now.toISOString(),
            }));

        return { online };
    }

    if (method === 'POST' && path === '/chat/presence/snapshot/') {
        const targets = Array.isArray(payload.target_identity_ids)
            ? payload.target_identity_ids
                .map((id) => String(id || '').trim())
                .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
                .slice(0, 100)
            : [];
        const presences = unwrap(await supabase.rpc('chat_presence_snapshot', {
            p_viewer: userId,
            p_targets: targets,
        })) ?? [];

        return { presences };
    }

    throw new GatewayError(
        `Ruta de chat aún no disponible en Supabase: ${path}`,
        501,
    );
}

async function agoraFor(
    supabase: SupabaseClient,
    channelName: string,
): Promise<Json> {
    const agora = await supabase.functions.invoke('agora-token', {
        body: { channel_name: channelName, uid: 1 },
    });

    return {
        app_id: agora.data?.app_id || '',
        channel_name: channelName,
        uid: 1,
        token: agora.data?.token || '',
        expires_at: agora.data?.expires_in || 3600,
    };
}

async function handleCalls(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const startMatch = path.match(/^\/calls\/conversations\/([0-9a-f-]{36})\/start\/$/i);

    if (method === 'POST' && startMatch) {
        const call = asJson(unwrap(await supabase.rpc('start_call', {
            p_conversation_id: startMatch[1],
            p_kind: payload.call_type === 'video' ? 'video' : 'audio',
        })));
        const channel = String(call.agora_channel_name || '');

        return {
            call,
            participant: {
                identity_id: payload.actor_identity_id || userId,
                agora_uid: 1,
                status: 'joined',
            },
            participants: asRows(call.participants),
            can_end_call: true,
            can_kick_participants: false,
            agora: await agoraFor(supabase, channel),
        };
    }

    const activeMatch = path.match(/^\/calls\/conversations\/([0-9a-f-]{36})\/active\/$/i);
    if (method === 'GET' && activeMatch) {
        const row = unwrap(await supabase
            .from('calls')
            .select('*')
            .eq('conversation_id', activeMatch[1])
            .in('status', ['ringing', 'active'])
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle());
        return row ? mapCallRow(row) : null;
    }

    const historyMatch = path.match(/^\/calls\/conversations\/([0-9a-f-]{36})\/history\/$/i);
    if (method === 'GET' && historyMatch) {
        const rows = unwrap(await supabase
            .from('calls')
            .select('*')
            .eq('conversation_id', historyMatch[1])
            .order('started_at', { ascending: false })
            .limit(Number(query.get('limit') || 50))) ?? [];

        return {
            calls: (rows as Json[]).map(mapCallRow),
            limit: Number(query.get('limit') || 50),
            next_before_created_at: null,
        };
    }

    const detailMatch = path.match(/^\/calls\/([0-9a-f-]{36})\/$/i);
    if (method === 'GET' && detailMatch) {
        return unwrap(await supabase.rpc('get_call_detail', {
            p_call_id: detailMatch[1],
        }));
    }

    const actionMatch = path.match(/^\/calls\/([0-9a-f-]{36})\/([a-z-]+)\/$/i);
    if (actionMatch && method === 'POST') {
        const [, callId, action] = actionMatch;
        const rpcAction: Record<string, string> = {
            join: 'join',
            leave: 'leave',
            end: 'end',
            decline: 'decline',
            'confirm-joined': 'join',
            'cancel-join-attempt': 'cancel',
        };
        if (action === 'refresh-token') {
            const detail = asJson(unwrap(await supabase.rpc('get_call_detail', {
                p_call_id: callId,
            })));
            const call = asJson(detail.call);
            return {
                ...detail,
                participant: {
                    identity_id: userId,
                    agora_uid: 1,
                    status: 'joined',
                },
                agora: await agoraFor(supabase, String(call.agora_channel_name || '')),
            };
        }
        const mapped = rpcAction[action];
        if (!mapped) {
            throw new GatewayError(`Acción de llamada no disponible: ${action}`, 501);
        }
        const detail = asJson(unwrap(await supabase.rpc('call_action', {
            p_call_id: callId,
            p_action: mapped,
        })));
        if (action === 'join') {
            const call = asJson(detail.call);
            return {
                ...detail,
                participant: {
                    identity_id: userId,
                    agora_uid: 1,
                    status: 'joined',
                },
                agora: await agoraFor(supabase, String(call.agora_channel_name || '')),
            };
        }
        if (action === 'confirm-joined') {
            return {
                participant: {
                    identity_id: userId,
                    agora_uid: 1,
                    status: 'joined',
                },
            };
        }
        return detail;
    }

    throw new GatewayError(
        `Ruta de llamadas aún no disponible en Supabase: ${path}`,
        501,
    );
}


function followState(row: Json): string {
    const notes = String(row.notes || 'accepted');
    return notes === 'pending' || notes === 'rejected' ? notes : 'accepted';
}

function mapStatusFollow(
    row: Json,
    followerId: string,
    targetId: string,
): Json {
    const state = followState(row);
    const created = row.created_at ?? null;
    const updated = row.updated_at ?? created;

    return {
        id: row.id,
        follower_profile_id: followerId,
        target_actor_type: 'profile',
        target_profile_id: targetId,
        target_commercial_profile_id: null,
        state,
        requested_at: created,
        responded_at: state === 'pending' ? null : updated,
        accepted_at: state === 'accepted' ? updated : null,
        rejected_at: state === 'rejected' ? updated : null,
        created_at: created,
        updated_at: updated,
    };
}

async function statusFollowList(
    supabase: SupabaseClient,
    scope: 'following' | 'followers' | 'requests',
): Promise<Json[]> {
    const rows = asRows<Json>(unwrap(await supabase.rpc('list_status_follows', {
        p_scope: scope,
    })));
    const urls = await signedUrlsForFileIds(
        supabase,
        rows.map((row) => row.avatar_file_id).filter(Boolean).map(String),
    );

    return rows.map((row) => {
        const state = followState(row);
        const avatarId = row.avatar_file_id ? String(row.avatar_file_id) : null;

        return {
            id: row.id,
            state,
            requested_at: row.created_at,
            responded_at: state === 'pending' ? null : row.updated_at,
            accepted_at: state === 'accepted' ? row.updated_at : null,
            rejected_at: state === 'rejected' ? row.updated_at : null,
            target: {
                actor_type: 'profile',
                profile_id: row.person_id ?? null,
                commercial_profile_id: null,
                display_name: String(row.display_name || 'Usuario'),
                avatar_file_id: avatarId,
                avatar_url: avatarId ? urls.get(avatarId) ?? null : null,
                is_available: true,
            },
        };
    });
}

async function handleStatuses(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
    supabase: SupabaseClient,
    userId: string,
): Promise<unknown> {
    const payload = asJson(body);

    if (method === 'GET' && path === '/statuses/feed/') {
        const limit = Number(query.get('limit') || 30);
        const followRows = asRows<Json>(unwrap(await supabase
            .from('contacts')
            .select('linked_user_id, notes')
            .eq('owner_id', userId)
            .eq('kind', 'follow'))) ?? [];
        const authorIds = followRows
            .filter((row) => followState(row) === 'accepted')
            .map((row) => String(row.linked_user_id || ''))
            .filter(Boolean);

        if (!authorIds.length) {
            return { items: [], limit };
        }

        const rows = unwrap(await supabase
            .from('statuses')
            .select('*')
            .in('author_id', authorIds)
            .is('archived_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(limit)) ?? [];
        const feedAuthorIds = Array.from(new Set((rows as Json[]).map((row) => String(row.author_id))));
        const authors = feedAuthorIds.length
            ? unwrap(await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_file_id')
                .in('id', feedAuthorIds)) ?? []
            : [];
        const byAuthor = new Map((authors as Json[]).map((author) => [String(author.id), author]));
        const avatarUrls = await signedUrlsForFileIds(
            supabase,
            (authors as Json[]).map((author) => author.avatar_file_id),
        );
        const grouped = new Map<string, Json>();
        for (const row of rows as Json[]) {
            const authorId = String(row.author_id);
            const author = byAuthor.get(authorId);
            const story = await mapStatusRowToStory(
                supabase,
                row,
                author,
                userId,
                author?.avatar_file_id
                    ? avatarUrls.get(String(author.avatar_file_id)) ?? null
                    : null,
            );
            const current = grouped.get(authorId);
            if (!current) {
                grouped.set(authorId, {
                    author: {
                        ...(story.actor as Json),
                        active_story_count: 1,
                        unseen_story_count: story.is_owner ? 0 : 1,
                        has_unseen: story.is_owner !== true,
                        latest_story_at: row.created_at,
                    },
                    stories: [story],
                });
            } else {
                (current.stories as Json[]).push(story);
                const author = current.author as Json;
                author.active_story_count = Number(author.active_story_count) + 1;
            }
        }

        return { items: Array.from(grouped.values()), limit };
    }

    if (method === 'GET' && path === '/statuses/mine/') {
        const rows = unwrap(await supabase
            .from('statuses')
            .select('*')
            .eq('author_id', userId)
            .order('created_at', { ascending: false })) ?? [];
        const profile = unwrap(await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_file_id')
            .eq('id', userId)
            .maybeSingle());
        const avatarUrls = await signedUrlsForFileIds(
            supabase,
            [profile?.avatar_file_id],
        );
        const avatarUrl = profile?.avatar_file_id
            ? avatarUrls.get(String(profile.avatar_file_id)) ?? null
            : null;
        const stories = await Promise.all(
            (rows as Json[])
                .filter((row) => !row.archived_at)
                .map((row) => mapStatusRowToStory(
                    supabase,
                    row,
                    profile || undefined,
                    userId,
                    avatarUrl,
                )),
        );

        return {
            active: {
                profile: {
                    actor: stories[0]?.actor ?? null,
                    stories,
                },
                commercial_profiles: [],
            },
            archive: null,
        };
    }

    if (method === 'POST' && path === '/statuses/') {
        const created = unwrap(await supabase
            .from('statuses')
            .insert({
                author_id: userId,
                body: payload.text_content || payload.caption || '',
                background: statusBackgroundRecord({
                    textBackgroundId: payload.text_background_id,
                    editorMetadata: payload.editor_metadata,
                    commercialOfferLink: payload.commercial_offer_link,
                }),
                media: asJson(payload.media).file_id
                    ? asJson(payload.media)
                    : [],
                layers: statusLayersWithFileIds(payload.image_layers),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .select('*')
            .single());
        const profile = unwrap(await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_file_id')
            .eq('id', userId)
            .maybeSingle());
        const avatarUrls = await signedUrlsForFileIds(
            supabase,
            [profile?.avatar_file_id],
        );

        return {
            status: await mapStatusRowToStory(
                supabase,
                created,
                profile || undefined,
                userId,
                profile?.avatar_file_id
                    ? avatarUrls.get(String(profile.avatar_file_id)) ?? null
                    : null,
            ),
        };
    }

    const statusMatch = path.match(/^\/statuses\/([0-9a-f-]{36})\/$/i);
    if (statusMatch && method === 'GET') {
        const row = unwrap(await supabase
            .from('statuses')
            .select('*')
            .eq('id', statusMatch[1])
            .single());
        const profile = unwrap(await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_file_id')
            .eq('id', row.author_id)
            .maybeSingle());
        const avatarUrls = await signedUrlsForFileIds(
            supabase,
            [profile?.avatar_file_id],
        );
        return {
            status: await mapStatusRowToStory(
                supabase,
                row,
                profile || undefined,
                userId,
                profile?.avatar_file_id
                    ? avatarUrls.get(String(profile.avatar_file_id)) ?? null
                    : null,
            ),
        };
    }

    if (statusMatch && method === 'DELETE') {
        const row = unwrap(await supabase
            .from('statuses')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', statusMatch[1])
            .eq('author_id', userId)
            .select('*')
            .single());
        return {
            status: await mapStatusRowToStory(supabase, row, undefined, userId),
            archived: true,
        };
    }

    const viewMatch = path.match(/^\/statuses\/([0-9a-f-]{36})\/views\/$/i);
    if (viewMatch && method === 'POST') {
        unwrap(await supabase.from('status_views').upsert({
            status_id: viewMatch[1],
            viewer_id: userId,
            viewed_at: new Date().toISOString(),
        }, { onConflict: 'status_id,viewer_id' }));
        return { view: { story_id: viewMatch[1], viewer_profile_id: userId, viewed_at: new Date().toISOString() } };
    }

    const viewersMatch = path.match(/^\/statuses\/([0-9a-f-]{36})\/viewers\/$/i);
    if (viewersMatch && method === 'GET') {
        const views = unwrap(await supabase
            .from('status_views')
            .select('viewer_id, viewed_at')
            .eq('status_id', viewersMatch[1])) ?? [];
        return {
            story_id: viewersMatch[1],
            count: views.length,
            viewers: (views as Json[]).map((view) => ({
                profile_id: view.viewer_id,
                display_name: '',
                avatar_file_id: null,
                avatar_url: null,
                avatar_url_expires_in_seconds: null,
                viewed_at: view.viewed_at,
            })),
        };
    }

    const replyMatch = path.match(/^\/statuses\/([0-9a-f-]{36})\/replies\/$/i);
    if (replyMatch && method === 'POST') {
        const story = unwrap(await supabase
            .from('statuses')
            .select('author_id')
            .eq('id', replyMatch[1])
            .maybeSingle()) as Json | null;

        if (!story?.author_id) {
            throw new GatewayError('No encontramos ese estado.', 404);
        }

        const conversationId = String(unwrap(await supabase.rpc('create_direct_chat', {
            p_recipient_id: story.author_id,
        })));
        const message = mapMessage(unwrap(await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: userId,
                body: payload.body || '',
                kind: 'text',
            })
            .select('*')
            .single()));

        return {
            conversation: await loadConversation(supabase, conversationId, userId),
            message,
        };
    }

    if (method === 'POST' && path === '/statuses/follows/') {
        const target = String(payload.target_profile_id || '');
        const existing = unwrap(await supabase
            .from('contacts')
            .select('*')
            .eq('owner_id', userId)
            .eq('linked_user_id', target)
            .eq('kind', 'follow')
            .maybeSingle()) as Json | null;
        const follow = existing || unwrap(await supabase
            .from('contacts')
            .insert({
                owner_id: userId,
                linked_user_id: target,
                kind: 'follow',
                display_name: 'Seguido',
                notes: 'accepted',
            })
            .select('*')
            .single()) as Json;

        return { follow: mapStatusFollow(follow, userId, target) };
    }

    if (method === 'GET' && path === '/statuses/follows/discover/') {
        const limit = Number(query.get('limit') || 20);
        const term = query.get('q') || '';
        const found = asRows<Json>(unwrap(await supabase.rpc(
            'search_beeapp_users_for_invitation',
            { p_query: term, p_limit: limit },
        )));
        const mine = asRows<Json>(unwrap(await supabase
            .from('contacts')
            .select('id, linked_user_id, notes')
            .eq('owner_id', userId)
            .eq('kind', 'follow')));
        const byUser = new Map(mine.map((row) => [String(row.linked_user_id), row]));
        const profileIds = found
            .map((row) => row.user_id)
            .filter(Boolean);
        const profiles = profileIds.length
            ? asRows<Json>(unwrap(await supabase
                .from('profiles')
                .select('id, avatar_file_id')
                .in('id', profileIds))) ?? []
            : [];
        const avatarByProfile = new Map(
            profiles.map((profile) => [String(profile.id), profile.avatar_file_id]),
        );
        const avatarUrls = await signedUrlsForFileIds(
            supabase,
            profiles.map((profile) => profile.avatar_file_id),
        );

        return {
            query: term,
            limit,
            next_cursor: null,
            items: found.map((row) => {
                const current = byUser.get(String(row.user_id));
                const avatarFileId = avatarByProfile.get(String(row.user_id)) ?? null;
                const avatarId = avatarFileId ? String(avatarFileId) : null;

                return {
                    actor_type: 'profile',
                    profile_id: row.user_id,
                    commercial_profile_id: null,
                    identity_id: row.user_id,
                    display_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Usuario',
                    avatar_file_id: avatarId,
                    avatar_url: avatarId
                        ? avatarUrls.get(avatarId) ?? null
                        : null,
                    avatar_url_expires_in_seconds: avatarId ? SIGNED_URL_SECONDS : null,
                    follow_id: current?.id ?? null,
                    follow_state: current ? followState(current) : null,
                };
            }),
        };
    }

    if (method === 'GET' && (
        path === '/statuses/follows/following/'
        || path === '/statuses/follows/followers/'
        || path === '/statuses/follows/requests/'
    )) {
        const scope = path.includes('/followers/')
            ? 'followers'
            : path.includes('/requests/')
                ? 'requests'
                : 'following';
        const limit = Number(query.get('limit') || 30);
        const items = await statusFollowList(supabase, scope);

        return {
            items: items.slice(0, limit),
            count: items.length,
            limit,
            next_cursor: null,
        };
    }

    const followAction = path.match(/^\/statuses\/follows\/([0-9a-f-]{36})\/(accept|reject)\/$/i);
    if (followAction && method === 'POST') {
        const follow = unwrap(await supabase.rpc('respond_status_follow', {
            p_follow_id: followAction[1],
            p_state: followAction[2] === 'accept' ? 'accepted' : 'rejected',
        })) as Json;

        return {
            follow: mapStatusFollow(
                follow,
                String(follow.owner_id || ''),
                String(follow.linked_user_id || ''),
            ),
        };
    }

    const followDelete = path.match(/^\/statuses\/follows\/([0-9a-f-]{36})\/$/i);
    if (followDelete && method === 'DELETE') {
        unwrap(await supabase.rpc('delete_status_follow', {
            p_follow_id: followDelete[1],
        }));
        return undefined;
    }

    throw new GatewayError(`Ruta de estados aún no disponible en Supabase: ${path}`, 501);
}


export async function dispatchSupabase(
    method: string,
    endpoint: string,
    body: unknown,
    headers: Record<string, string> = {},
): Promise<unknown> {
    const path = pathOf(endpoint);
    const query = queryOf(endpoint);
    const verb = method.toUpperCase();

    if (path.startsWith('/accounts/')) {
        return handleAccounts(verb, path, body);
    }

    if (path.startsWith('/storage/')) {
        return handleStorage(verb, path, body, query);
    }

    if (path.startsWith('/notes/')) {
        return handleNotes(verb, path, body, query);
    }

    if (path.startsWith('/chat/')) {
        return handleChat(verb, path, body, query);
    }

    if (path.startsWith('/calls/')) {
        return handleCalls(verb, path, body, query);
    }

    if (path.startsWith('/commercial/')) {
        return handleCommercial(verb, path, body, query, headers);
    }

    if (path.startsWith('/calendar/')) {
        return handleCalendar(verb, path, body, query);
    }

    if (path.startsWith('/mail/')) {
        return handleMail(verb, path, body, query);
    }

    if (path.startsWith('/integrations/')) {
        return handleIntegrations(verb, path, body);
    }

    if (path.startsWith('/assistant/')) {
        return handleAssistant(verb, path, body);
    }

    const { supabase, userId } = await requireClient();

    if (verb === 'GET' && path === '/notifications/') {
        const limit = Number(query.get('limit') || 50);
        const offset = Number(query.get('offset') || 0);
        const notifications = unwrap(await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)) ?? [];
        const unread = notifications.filter((item) => !item.read_at).length;

        return {
            notifications,
            count: notifications.length,
            limit,
            offset,
            unread_count: unread,
        };
    }

    const readMatch = path.match(
        /^\/notifications\/([0-9a-f-]{36})\/read\/$/i,
    );

    if (verb === 'POST' && readMatch) {
        const notification = unwrap(await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', readMatch[1])
            .eq('user_id', userId)
            .select('*')
            .single());
        return { notification };
    }

    if (verb === 'POST' && path === '/notifications/read-all/') {
        const updated = unwrap(await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .is('read_at', null)
            .select('id')) ?? [];
        return {
            message: 'Notificaciones leídas.',
            updated_count: updated.length,
        };
    }

    if (verb === 'POST' && path === '/notifications/push-devices/') {
        const payload = asJson(body);
        const subscriptionId = String(
            payload.onesignal_subscription_id
            || payload.subscription_id
            || '',
        ).trim();
        const deviceSessionId = String(
            payload.device_session_id || '',
        ).trim();
        let update = supabase
            .from('devices')
            .update({
                onesignal_subscription_id: subscriptionId || null,
                app_version: payload.app_version || null,
                platform: payload.platform || null,
            })
            .eq('user_id', userId)
            .eq('is_active', true);

        if (deviceSessionId) {
            update = update.eq('id', deviceSessionId);
        }

        unwrap(await update);
        return {
            device: { onesignal_subscription_id: subscriptionId },
            message: 'Dispositivo registrado.',
        };
    }

    if (verb === 'GET' && path === '/statuses/text-backgrounds/') {
        const setting = unwrap(await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'status_text_backgrounds')
            .maybeSingle());
        let backgrounds: unknown[] = [];
        try {
            backgrounds = JSON.parse(String(setting?.value || '[]'));
        } catch {
            backgrounds = [];
        }
        return { backgrounds: Array.isArray(backgrounds) ? backgrounds : [] };
    }

    if (path.startsWith('/statuses/')) {
        return handleStatuses(verb, path, body, query, supabase, userId);
    }


    throw new GatewayError(
        `Esta vista todavía no tiene consulta Supabase (${verb} ${path}).`,
        501,
    );
}

export async function dispatchUpload(
    endpoint: string,
    formData: FormData,
): Promise<unknown> {
    return uploadThroughSupabase(endpoint, formData);
}
