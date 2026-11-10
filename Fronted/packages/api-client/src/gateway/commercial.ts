import type { SupabaseClient } from '@supabase/supabase-js';

import {
    asJson,
    asRows,
    createId,
    GatewayError,
    headerValue,
    type Json,
    requireClient,
    signedUrlsForFileIds,
    SIGNED_URL_SECONDS,
    unwrap,
    } from './runtime';
import {
    businessSearchBlob,
    marketplaceMatchScore,
    marketplaceSearchTerms,
    offerSearchBlob,
    } from './marketplaceSearch';
import {
    isBusinessRowOpenNow,
    validateReservationIsoAgainstBusinessHours,
    } from './businessSchedule';

function partsOf(path: string): string[] {
    return path.split('/').filter(Boolean);
}

function publishedOffer(status: unknown): boolean {
    const value = String(status || '');
    return value === 'published' || value === 'active';
}

function offerIsAvailableToCustomers(row: Json): boolean {
    return !row.archived_at
        && String(row.status || '') !== 'archived'
        && publishedOffer(row.status)
        && row.is_available !== false;
}

function emptyProductFeed(
    limit: number,
    offset: number,
    seed: string | null,
) {
    return {
        offers: [] as Json[],
        count: 0,
        limit,
        offset,
        next_offset: null as number | null,
        has_more: false,
        seed: seed || 'buddy',
        profiles: [] as Json[],
        profiles_count: 0,
        profiles_next_offset: null as number | null,
        profiles_has_more: false,
    };
}

async function loadCategoryNames(
    supabase: SupabaseClient,
): Promise<Map<string, string>> {
    const rows = (unwrap(await supabase
        .from('categories')
        .select('id, name')
        .limit(500)) ?? []) as Json[];

    return new Map(rows.map((row) => [
        String(row.id),
        String(row.name || ''),
    ]));
}

function nestedBusinessOwnerId(row: Json): string {
    const nested = nestedBusiness(row);
    return String(nested?.owner_id || row.owner_id || '');
}

function nestedBusiness(row: Json): Json | null {
    const nested = row.businesses;
    if (Array.isArray(nested)) {
        const first = nested[0];
        return first && typeof first === 'object'
            ? first as Json
            : null;
    }
    if (nested && typeof nested === 'object') {
        return nested as Json;
    }
    return null;
}

const FEED_OFFER_TYPES = new Set([
    'products',
    'services',
    'mixed',
]);

const FEED_MODALITIES = new Set([
    'at_establishment',
    'in_person',
    'virtual',
    'home_visit',
    'delivery',
    'pickup',
    'phone_call',
    'buddy_chat',
]);

function feedFilterValue(
    value: string | null,
    allowed: Set<string>,
): string | null {
    const normalized = String(value || '').trim();
    return allowed.has(normalized) ? normalized : null;
}

function modalityValues(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => (
            typeof item === 'string'
                ? item
                : String((item as Json)?.modality || '')
        ))
        .filter(Boolean);
}

function matchesBusinessFeedFilters(
    row: Json,
    offerType: string | null,
    modality: string | null,
): boolean {
    if (
        offerType
        && String(row.offer_type || '') !== offerType
    ) {
        return false;
    }

    if (
        modality
        && !modalityValues(row.modalities).includes(modality)
    ) {
        return false;
    }

    return true;
}

function matchesOfferFeedFilters(
    row: Json,
    offerType: string | null,
    modality: string | null,
): boolean {
    const business = nestedBusiness(row);

    if (
        (offerType || modality)
        && (
            !business
            || !matchesBusinessFeedFilters(
                business,
                offerType,
                modality,
            )
        )
    ) {
        return false;
    }

    if (
        offerType === 'products'
        && String(row.offer_kind || '') !== 'product'
    ) {
        return false;
    }

    if (
        offerType === 'services'
        && String(row.offer_kind || '') !== 'service'
    ) {
        return false;
    }

    if (
        modality
        && !modalityValues(row.modalities).includes(modality)
    ) {
        return false;
    }

    return true;
}

async function publishedBusinessRows(
    supabase: SupabaseClient,
    excludeOwnerId?: string,
): Promise<Json[]> {
    let request = supabase
        .from('businesses')
        .select('*')
        .eq('is_public', true)
        .eq('is_available', true)
        .eq('publication_status', 'published')
        .is('archived_at', null);
    if (excludeOwnerId) {
        request = request.neq('owner_id', excludeOwnerId);
    }
    const rows = (unwrap(await request
        .order('created_at', { ascending: false })
        .limit(200)) ?? []) as Json[];
    return rows.filter((row) => isBusinessRowOpenNow(row));
}

function rankMarketplaceRows(
    rows: Json[],
    terms: string[],
    blobOf: (row: Json) => string,
): Json[] {
    const byRecent = (left: Json, right: Json) => (
        String(right.created_at || '').localeCompare(String(left.created_at || ''))
    );

    if (terms.length === 0) {
        return [...rows].sort(byRecent);
    }

    return rows
        .map((row) => ({
            row,
            score: marketplaceMatchScore(blobOf(row), terms),
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) => (
            right.score - left.score || byRecent(left.row, right.row)
        ))
        .map((item) => item.row);
}

function offerStatus(value: unknown): string {
    const status = String(value || 'active');
    if (status === 'active') return 'published';
    return status;
}

async function ownedBusiness(
    supabase: SupabaseClient,
    userId: string,
    businessId: string,
): Promise<Json> {
    const row = unwrap(await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('owner_id', userId)
        .maybeSingle()) as Json | null;

    if (!row) throw new GatewayError('No encontramos el negocio.', 404);
    return row;
}

async function anyBusiness(
    supabase: SupabaseClient,
    businessId: string,
): Promise<Json> {
    const row = unwrap(await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle()) as Json | null;

    if (!row) throw new GatewayError('No encontramos el negocio.', 404);
    return row;
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
    if (!error) {
        return false;
    }

    const code = String(error.code || '').toUpperCase();
    const message = String(error.message || '').toLowerCase();

    return (
        code === 'PGRST202'
        || code === '42883'
        || message.includes('could not find the function')
        || message.includes('does not exist')
    );
}

async function computeBusinessDeletionStatusDirect(
    supabase: SupabaseClient,
    businessId: string,
): Promise<{ can_delete: boolean; orders: number; chats: number }> {
    const [ordersResult, conversationsResult] = await Promise.all([
        supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', businessId),
        supabase
            .from('conversations')
            .select('id')
            .eq('business_id', businessId)
            .eq('kind', 'business'),
    ]);

    if (ordersResult.error) {
        throw new GatewayError(ordersResult.error.message, 400);
    }

    if (conversationsResult.error) {
        throw new GatewayError(conversationsResult.error.message, 400);
    }

    const ordersCount = ordersResult.count ?? 0;
    const conversationIds = ((conversationsResult.data ?? []) as Json[])
        .map((row) => String(row.id || '').trim())
        .filter(Boolean);

    let activeChatsCount = 0;

    if (conversationIds.length > 0) {
        const [messagesResult, callsResult] = await Promise.all([
            supabase
                .from('messages')
                .select('conversation_id')
                .in('conversation_id', conversationIds),
            supabase
                .from('calls')
                .select('conversation_id')
                .in('conversation_id', conversationIds),
        ]);

        if (messagesResult.error) {
            throw new GatewayError(messagesResult.error.message, 400);
        }

        if (callsResult.error) {
            throw new GatewayError(callsResult.error.message, 400);
        }

        const activeConversationIds = new Set<string>();

        for (const row of (messagesResult.data ?? []) as Json[]) {
            const cid = String(row.conversation_id || '').trim();
            if (cid) {
                activeConversationIds.add(cid);
            }
        }

        for (const row of (callsResult.data ?? []) as Json[]) {
            const cid = String(row.conversation_id || '').trim();
            if (cid) {
                activeConversationIds.add(cid);
            }
        }

        activeChatsCount = activeConversationIds.size;
    }

    return {
        can_delete: ordersCount === 0 && activeChatsCount === 0,
        orders: ordersCount,
        chats: activeChatsCount,
    };
}

async function getBusinessDeletionStatus(
    supabase: SupabaseClient,
    businessId: string,
): Promise<{ can_delete: boolean; orders: number; chats: number }> {
    const rpcResult = await supabase.rpc('get_business_delete_status', {
        p_business_id: businessId,
    });

    if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === 'object') {
        const payload = asJson(rpcResult.data);
        return {
            can_delete: payload.can_delete === true,
            orders: Number(payload.orders ?? 0) || 0,
            chats: Number(payload.chats ?? 0) || 0,
        };
    }

    if (isMissingRpcError(rpcResult.error)) {
        return computeBusinessDeletionStatusDirect(supabase, businessId);
    }

    throw new GatewayError(
        rpcResult.error?.message || 'No pudimos comprobar el estado del negocio.',
        400,
    );
}

async function deleteOwnedBusiness(
    supabase: SupabaseClient,
    userId: string,
    businessId: string,
): Promise<void> {
    const deleted = await supabase.rpc('delete_business', {
        p_business_id: businessId,
    });

    if (!deleted.error) {
        return;
    }

    if (deleted.error.code === '23503') {
        throw new GatewayError(
            'Este negocio ya tiene chats, compras o solicitudes y no se puede eliminar. Puedes desactivarlo.',
            409,
        );
    }

    if (!isMissingRpcError(deleted.error)) {
        throw new GatewayError(deleted.error.message, 400);
    }

    const status = await computeBusinessDeletionStatusDirect(supabase, businessId);

    if (!status.can_delete) {
        throw new GatewayError(
            'Este negocio ya tiene chats, compras o solicitudes y no se puede eliminar. Puedes desactivarlo.',
            409,
        );
    }

    // Limpia conversaciones vacías del negocio antes de borrarlo.
    await supabase
        .from('conversations')
        .delete()
        .eq('business_id', businessId)
        .eq('kind', 'business');

    const deleteRes = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)
        .eq('owner_id', userId);

    if (deleteRes.error) {
        throw new GatewayError(deleteRes.error.message, 400);
    }
}

async function computeOfferDeletionStatusDirect(
    supabase: SupabaseClient,
    businessId: string,
    offerId: string,
): Promise<{ can_delete: boolean; orders: number; chats: number }> {
    const normalizedOfferId = String(offerId || '').trim();
    const [ordersResult, conversationsResult] = await Promise.all([
        supabase
            .from('orders')
            .select('id, items, reservation')
            .eq('business_id', businessId),
        supabase
            .from('conversations')
            .select('id')
            .eq('business_id', businessId)
            .eq('kind', 'business'),
    ]);

    if (ordersResult.error) {
        throw new GatewayError(ordersResult.error.message, 400);
    }

    if (conversationsResult.error) {
        throw new GatewayError(conversationsResult.error.message, 400);
    }

    let ordersCount = 0;

    for (const orderRow of (ordersResult.data ?? []) as Json[]) {
        const items = asRows<Json>(orderRow.items);
        const reservation = asJson(orderRow.reservation);
        const matchesItem = items.some((item) => {
            const snapshot = asJson(item.offer_snapshot);
            const itemOfferId = String(
                item.commercial_offer_id
                || item.offer_id
                || snapshot.id
                || '',
            ).trim();
            return itemOfferId === normalizedOfferId;
        });
        const reservationOfferId = String(
            reservation.commercial_offer_id
            || reservation.offer_id
            || '',
        ).trim();

        if (matchesItem || reservationOfferId === normalizedOfferId) {
            ordersCount += 1;
        }
    }

    const conversationIds = ((conversationsResult.data ?? []) as Json[])
        .map((row) => String(row.id || '').trim())
        .filter(Boolean);

    let chatsCount = 0;

    if (conversationIds.length > 0 && normalizedOfferId) {
        const messagesResult = await supabase
            .from('messages')
            .select('conversation_id, body, attachments')
            .in('conversation_id', conversationIds)
            .is('deleted_at', null);

        if (messagesResult.error) {
            throw new GatewayError(messagesResult.error.message, 400);
        }

        const matchedConversations = new Set<string>();
        const lowerOfferId = normalizedOfferId.toLowerCase();

        for (const row of (messagesResult.data ?? []) as Json[]) {
            const cid = String(row.conversation_id || '').trim();
            const bodyText = String(row.body || '').toLowerCase();
            const attachmentsText = JSON.stringify(row.attachments ?? []).toLowerCase();

            if (
                cid
                && (
                    bodyText.includes(lowerOfferId)
                    || attachmentsText.includes(lowerOfferId)
                )
            ) {
                matchedConversations.add(cid);
            }
        }

        chatsCount = matchedConversations.size;
    }

    return {
        can_delete: ordersCount === 0 && chatsCount === 0,
        orders: ordersCount,
        chats: chatsCount,
    };
}

async function getOfferDeletionStatus(
    supabase: SupabaseClient,
    businessId: string,
    offerId: string,
): Promise<{ can_delete: boolean; orders: number; chats: number }> {
    const rpcResult = await supabase.rpc('get_offer_delete_status', {
        p_offer_id: offerId,
    });

    if (!rpcResult.error && rpcResult.data && typeof rpcResult.data === 'object') {
        const payload = asJson(rpcResult.data);
        return {
            can_delete: payload.can_delete === true,
            orders: Number(payload.orders ?? 0) || 0,
            chats: Number(payload.chats ?? 0) || 0,
        };
    }

    if (isMissingRpcError(rpcResult.error)) {
        return computeOfferDeletionStatusDirect(supabase, businessId, offerId);
    }

    throw new GatewayError(
        rpcResult.error?.message || 'No pudimos comprobar el estado de la oferta.',
        400,
    );
}

async function deleteOwnedOfferRecord(
    supabase: SupabaseClient,
    businessId: string,
    offerId: string,
): Promise<void> {
    const deleted = await supabase.rpc('delete_offer', {
        p_offer_id: offerId,
    });

    if (!deleted.error) {
        return;
    }

    if (deleted.error.code === '23503') {
        throw new GatewayError(
            'Este producto o servicio ya se usó en chats, compras o solicitudes y no se puede eliminar. Puedes pausarlo o desactivarlo.',
            409,
        );
    }

    if (!isMissingRpcError(deleted.error)) {
        throw new GatewayError(deleted.error.message, 400);
    }

    const status = await computeOfferDeletionStatusDirect(supabase, businessId, offerId);

    if (!status.can_delete) {
        throw new GatewayError(
            'Este producto o servicio ya se usó en chats, compras o solicitudes y no se puede eliminar. Puedes pausarlo o desactivarlo.',
            409,
        );
    }

    const deleteRes = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId)
        .eq('business_id', businessId);

    if (deleteRes.error) {
        throw new GatewayError(deleteRes.error.message, 400);
    }
}

function catalogsOf(business: Json): Json[] {
    return asRows<Json>(business.catalogs);
}

function paymentMethodsOf(business: Json): Json[] {
    return asRows<Json>(business.payment_methods);
}

async function mapImages(
    supabase: SupabaseClient,
    images: Json[],
): Promise<Json[]> {
    const urls = await signedUrlsForFileIds(
        supabase,
        images.map((image) => image.file_id),
    );

    return images.map((image) => ({
        id: image.id,
        file_id: image.file_id,
        display_name: image.display_name ?? null,
        mime_type: image.mime_type ?? null,
        sort_order: image.sort_order ?? 0,
        is_primary: image.is_primary === true,
        url: image.file_id ? urls.get(String(image.file_id)) ?? null : null,
        url_expires_in_seconds: SIGNED_URL_SECONDS,
        status: image.status || 'active',
        archived_at: image.archived_at ?? null,
        created_at: image.created_at ?? null,
        updated_at: image.updated_at ?? null,
    }));
}

async function mapPublicOffer(
    supabase: SupabaseClient,
    row: Json,
): Promise<Json> {
    return {
        id: row.id,
        commercial_profile_id: row.business_id,
        catalog_id: row.catalog,
        offer_kind: row.offer_kind,
        title: row.title,
        description: row.description ?? null,
        pricing_strategy: row.pricing_strategy || 'fixed',
        base_price_amount: row.base_price_amount == null ? null : Number(row.base_price_amount),
        original_price_amount: row.original_price_amount == null ? null : Number(row.original_price_amount),
        discount_percent: row.discount_percent == null ? null : Number(row.discount_percent),
        currency_code: row.currency_code || 'COP',
        modalities: Array.isArray(row.modalities) ? row.modalities : [],
        duration_minutes: row.duration_minutes ?? null,
        requires_booking: row.requires_booking === true,
        payment_policy: row.payment_policy ?? null,
        images: await mapImages(supabase, asRows<Json>(row.images).filter(
            (image) => image.status !== 'archived',
        )),
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function mapOwnedOffer(
    supabase: SupabaseClient,
    row: Json,
): Promise<Json> {
    const stock = row.stock_quantity == null ? null : Number(row.stock_quantity);

    return {
        ...(await mapPublicOffer(supabase, row)),
        is_available: row.is_available !== false,
        sort_order: Number(row.sort_order || 0),
        status: offerStatus(row.status),
        archived_at: row.archived_at ?? null,
        track_inventory: row.track_inventory === true,
        stock_quantity: stock,
        reserved_inventory: 0,
        available_inventory: stock,
        modalities: (Array.isArray(row.modalities) ? row.modalities : []).map((modality) => ({
            modality,
            status: 'active',
            commercial_profile_id: row.business_id,
        })),
    };
}

async function mapProfile(
    supabase: SupabaseClient,
    row: Json,
    owned: boolean,
): Promise<Json> {
    const urls = await signedUrlsForFileIds(supabase, [row.logo_file_id]);
    const logoUrl = row.logo_file_id
        ? urls.get(String(row.logo_file_id)) ?? null
        : null;
    const categories = asRows<string>(row.category_ids).map((id, index) => ({
        commercial_profile_id: row.id,
        commercial_category_id: id,
        sort_order: index,
    }));

    if (!owned) {
        return {
            id: row.id,
            display_name: row.display_name,
            description: row.description || '',
            offer_type: row.offer_type,
            category: null,
            custom_activity_text: row.custom_activity_text ?? null,
            country_code: row.country_code || '',
            city: row.city || '',
            location: {
                address: row.is_address_public ? row.address : null,
                neighborhood: row.is_address_public ? row.neighborhood : null,
                location_reference: row.is_address_public ? row.location_reference : null,
                is_address_public: row.is_address_public === true,
            },
            contact: {
                phone_dial_code: row.is_phone_public ? row.phone_dial_code : null,
                phone_number: row.is_phone_public ? row.phone_number : null,
                email: row.is_email_public ? row.public_email : null,
                is_phone_public: row.is_phone_public === true,
                is_email_public: row.is_email_public === true,
            },
            logo_file_id: row.logo_file_id ?? null,
            logo_url: logoUrl,
            logo_url_expires_in_seconds: logoUrl ? SIGNED_URL_SECONDS : null,
            modalities: Array.isArray(row.modalities) ? row.modalities : [],
            delivery_fee_mode: row.delivery_fee_mode,
            delivery_currency_code: 'COP',
            is_verified: row.verification_status === 'verified' && row.verification_badge_visible === true,
            is_available: row.is_available !== false,
            is_open_now: isBusinessRowOpenNow(row),
            hours: asRows(row.hours),
            timezone: row.timezone,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }

    return {
        ...row,
        description: row.description || '',
        country_code: row.country_code || '',
        city: row.city || '',
        category_ids: Array.isArray(row.category_ids) ? row.category_ids : [],
        categories,
        logo_url: logoUrl,
        logo_url_expires_in_seconds: logoUrl ? SIGNED_URL_SECONDS : null,
        modalities: (Array.isArray(row.modalities) ? row.modalities : []).map((modality) => ({
            commercial_profile_id: row.id,
            modality,
            status: 'active',
        })),
        hours: asRows(row.hours),
        social_links: asRows(row.social_links),
    };
}

function mapCatalog(businessId: string, row: Json): Json {
    return {
        id: row.id,
        commercial_profile_id: businessId,
        name: row.name,
        description: row.description ?? null,
        sort_order: Number(row.sort_order || 0),
        status: row.status || 'published',
        archived_at: row.archived_at ?? null,
        created_at: row.created_at ?? null,
        updated_at: row.updated_at ?? null,
    };
}

function mapOrder(row: Json): Json {
    const items = asRows<Json>(row.items);

    return {
        id: row.id,
        request_id: row.id,
        code: row.code || String(row.id || '').slice(0, 8).toUpperCase(),
        request_type: row.request_type || 'product_order',
        status: row.status,
        commercial_profile_id: row.business_id,
        customer_id: row.customer_id,
        requested_modality: row.requested_modality ?? null,
        customer_note: row.customer_note ?? null,
        delivery_address: row.delivery_address ?? null,
        delivery_reference: row.delivery_reference ?? null,
        delivery_fee_mode: row.delivery_fee_mode || 'not_offered',
        subtotal_amount: Number(row.subtotal_amount || 0),
        delivery_fee_amount: row.delivery_fee_amount ?? null,
        total_amount: Number(row.total_amount || 0),
        currency_code: row.currency_code || 'COP',
        items,
        item_count: items.length,
        proposals: asRows(row.proposals),
        payment_proofs: asRows(row.payment_proofs),
        reservation: row.reservation ?? null,
        dispute: row.dispute ?? null,
        history: asRows(row.history),
        expires_at: row.expires_at ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function saveBusiness(
    supabase: SupabaseClient,
    businessId: string,
    patch: Json,
): Promise<Json> {
    return unwrap(await supabase
        .from('businesses')
        .update(patch)
        .eq('id', businessId)
        .select('*')
        .single()) as Json;
}

async function loadOrders(
    supabase: SupabaseClient,
): Promise<Json[]> {
    return (unwrap(await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })) ?? []) as Json[];
}

async function orderById(
    supabase: SupabaseClient,
    orderId: string,
): Promise<Json> {
    const row = unwrap(await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()) as Json | null;
    if (!row) throw new GatewayError('No encontramos la solicitud.', 404);
    return row;
}

async function mutateOrder(
    supabase: SupabaseClient,
    order: Json,
    patch: Json,
    action: string,
): Promise<Json> {
    const history = asRows<Json>(order.history);
    history.push({
        id: createId(),
        action,
        at: new Date().toISOString(),
        status: patch.status || order.status,
    });

    return unwrap(await supabase
        .from('orders')
        .update({ ...patch, history })
        .eq('id', order.id)
        .select('*')
        .single()) as Json;
}

function findOrderWith(
    orders: Json[],
    listKey: 'items' | 'proposals' | 'payment_proofs',
    id: string,
): { order: Json; entry: Json } | null {
    for (const order of orders) {
        const entry = asRows<Json>(order[listKey]).find((item) => item.id === id);
        if (entry) return { order, entry };
    }
    return null;
}

function orderIsOpen(status: string): boolean {
    return !['completed', 'rejected', 'cancelled', 'expired'].includes(status);
}

function scheduledServiceStartIso(order: Json): string | null {
    const requestType = String(order.request_type || '');
    const times: number[] = [];
    const pushTime = (value: unknown) => {
        const raw = String(value || '').trim();
        if (!raw) return;
        const parsed = Date.parse(raw);
        if (!Number.isNaN(parsed)) times.push(parsed);
    };

    for (const item of asRows<Json>(order.items)) {
        const kind = String(item.offer_kind || '');
        const booksTime = item.requires_booking === true;
        const isService = kind === 'service'
            || booksTime
            || requestType === 'service_request'
            || requestType === 'booking_request';
        const isPlainProduct = kind === 'product'
            && !booksTime
            && requestType !== 'service_request'
            && requestType !== 'booking_request';
        if (!isService || isPlainProduct) continue;
        const terms = item.original_terms && typeof item.original_terms === 'object'
            ? item.original_terms as Json
            : null;
        const acceptedProposal = asRows<Json>(item.proposals).find((proposal) => (
            proposal.status === 'accepted' && String(proposal.proposed_starts_at || '').trim()
        ));
        pushTime(acceptedProposal?.proposed_starts_at || item.requested_starts_at || terms?.requested_starts_at);
    }

    if (
        requestType === 'service_request'
        || requestType === 'booking_request'
        || requestType === 'mixed_request'
    ) {
        const reservation = order.reservation && typeof order.reservation === 'object'
            ? order.reservation as Json
            : null;
        if (reservation) pushTime(reservation.starts_at);
        const acceptedRequestProposal = asRows<Json>(order.proposals).find((proposal) => (
            proposal.status === 'accepted' && String(proposal.proposed_starts_at || '').trim()
        ));
        if (acceptedRequestProposal) pushTime(acceptedRequestProposal.proposed_starts_at);
    }

    if (!times.length) return null;
    return new Date(Math.max(...times)).toISOString();
}

function paymentConfirmationGate(order: Json): {
    ready: boolean;
    availableAt: string | null;
} {
    const availableAt = scheduledServiceStartIso(order);
    if (!availableAt) return { ready: true, availableAt: null };
    return {
        ready: Date.now() >= Date.parse(availableAt),
        availableAt,
    };
}

function permissions(role: 'customer' | 'business', order: Json): Json {
    const status = String(order.status || '');
    const open = orderIsOpen(status);
    const business = role === 'business';
    const proofs = asRows<Json>(order.payment_proofs);
    const hasSubmittedProof = proofs.some((proof) => proof.status === 'submitted');
    const hasRejectedProof = proofs.some((proof) => proof.status === 'rejected');
    const gate = paymentConfirmationGate(order);

    return {
        can_start_review: business && status === 'submitted',
        can_accept: business && open,
        can_reject: business && open,
        can_cancel: open,
        can_create_proposal: business && open,
        can_accept_proposal: role === 'customer' && open,
        can_reject_proposal: role === 'customer' && open,
        can_withdraw_proposal: business && open,
        can_request_payment: business && open,
        can_view_payment_methods: true,
        can_submit_payment_proof: role === 'customer' && open && !hasSubmittedProof,
        can_replace_payment_proof: role === 'customer' && open && hasRejectedProof && !hasSubmittedProof,
        can_review_payment_proof: business && open,
        can_create_reservation_hold: business && open,
        can_complete: false,
        can_confirm_payment: business && open && gate.ready,
        can_mark_order_unpaid: business && open,
        payment_confirmation_available_at: gate.availableAt,
        can_open_dispute: open,
        can_open_chat: true,
    };
}

export async function handleCommercial(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
    headers: Record<string, string> = {},
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const parts = partsOf(path);
    const limit = Number(query.get('limit') || 30);
    const offset = Number(query.get('offset') || 0);

    if (parts[1] === 'public' && parts[2] === 'countries' && method === 'GET') {
        const countries = unwrap(await supabase.rpc('commerce_public_countries')) ?? [];
        return { countries: Array.isArray(countries) ? countries : [] };
    }

    if (parts[1] === 'public' && parts[2] === 'cities' && method === 'GET') {
        const cities = unwrap(await supabase.rpc('commerce_public_cities', {
            p_country_code: query.get('country_code') || '',
        })) ?? [];
        return { cities: Array.isArray(cities) ? cities : [] };
    }

    if (parts[1] === 'public' && parts[2] === 'categories' && method === 'GET') {
        let request = supabase
            .from('categories')
            .select('id, parent_id, offer_type, name, slug, sort_order')
            .eq('is_active', true)
            .order('sort_order');
        if (query.get('offer_type')) request = request.eq('offer_type', query.get('offer_type'));
        if (query.get('search')) request = request.ilike('name', `%${query.get('search')}%`);
        const categories = unwrap(await request.limit(limit)) ?? [];
        return { categories };
    }

    if (parts[1] === 'public' && parts[2] === 'offers' && parts[3] === 'feed' && method === 'GET') {
        const rawSearch = (query.get('search') || '').trim();
        const terms = marketplaceSearchTerms(rawSearch);
        if (rawSearch && terms.length === 0) {
            return emptyProductFeed(limit, offset, query.get('seed'));
        }

        const offerType = feedFilterValue(
            query.get('offer_type'),
            FEED_OFFER_TYPES,
        );
        const modality = feedFilterValue(
            query.get('modality'),
            FEED_MODALITIES,
        );
        const categoryNames = terms.length > 0
            ? await loadCategoryNames(supabase)
            : new Map<string, string>();
        const rows = (unwrap(await supabase
            .from('offers')
            .select('*, businesses!inner(*)')
            .eq('businesses.is_public', true)
            .eq('businesses.is_available', true)
            .eq('businesses.publication_status', 'published')
            .is('businesses.archived_at', null)
            .is('archived_at', null)
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .limit(200)) ?? []) as Json[];
        const rankedOffers = rankMarketplaceRows(
            rows.filter((row) => (
                offerIsAvailableToCustomers(row)
                && nestedBusinessOwnerId(row) !== userId
                && isBusinessRowOpenNow(nestedBusiness(row))
                && matchesOfferFeedFilters(row, offerType, modality)
            )),
            terms,
            (row) => offerSearchBlob(row, categoryNames),
        );
        const offerPage = rankedOffers.slice(offset, offset + limit);
        const offers = await Promise.all(
            offerPage.map((row) => mapPublicOffer(supabase, row)),
        );
        const rankedBusinesses = rankMarketplaceRows(
            (await publishedBusinessRows(supabase, userId))
                .filter((row) => matchesBusinessFeedFilters(
                    row,
                    offerType,
                    modality,
                )),
            terms,
            (row) => businessSearchBlob(row, categoryNames),
        );
        const profileRows = rankedBusinesses.slice(offset, offset + limit);
        const profiles = await Promise.all(
            profileRows.map((profile) => mapProfile(supabase, profile, false)),
        );
        const profilesCount = rankedBusinesses.length;
        const profilesHasMore = offset + limit < rankedBusinesses.length;

        return {
            offers,
            count: rankedOffers.length,
            limit,
            offset,
            next_offset: offset + limit < rankedOffers.length ? offset + limit : null,
            has_more: offset + limit < rankedOffers.length,
            seed: query.get('seed') || 'buddy',
            profiles,
            profiles_count: profilesCount,
            profiles_next_offset: profilesHasMore ? offset + limit : null,
            profiles_has_more: profilesHasMore,
        };
    }

    if (parts[1] === 'public' && parts[2] === 'offers' && parts[3] && method === 'GET') {
        const row = unwrap(await supabase
            .from('offers')
            .select('*')
            .eq('id', parts[3])
            .maybeSingle()) as Json | null;
        if (!row || !offerIsAvailableToCustomers(row)) {
            throw new GatewayError('Este producto o servicio ya no está disponible.', 404);
        }
        return { offer: await mapPublicOffer(supabase, row) };
    }

    if (parts[1] === 'public' && parts[2] === 'profiles' && method === 'GET' && !parts[3]) {
        let request = supabase
            .from('businesses')
            .select('*')
            .eq('is_public', true)
            .eq('is_available', true)
            .eq('publication_status', 'published')
            .is('archived_at', null)
            .neq('owner_id', userId);
        if (query.get('country_code')) request = request.eq('country_code', query.get('country_code'));
        if (query.get('city')) request = request.eq('city', query.get('city'));
        if (query.get('offer_type')) request = request.eq('offer_type', query.get('offer_type'));
        const rawSearch = (query.get('search') || '').trim();
        const terms = marketplaceSearchTerms(rawSearch);
        const verifiedOnly = query.get('verified_only') === 'true';
        const ordering = query.get('ordering') === 'name' ? 'name' : 'recent';
        const isPublicProfile = (row: Json) => (
            (verifiedOnly ? row.verification_status === 'verified' : true)
            && isBusinessRowOpenNow(row)
        );

        if (rawSearch) {
            if (terms.length === 0) {
                return {
                    profiles: [],
                    count: 0,
                    limit,
                    offset,
                    ordering,
                };
            }

            const categoryNames = await loadCategoryNames(supabase);
            const matched = rankMarketplaceRows(
                ((unwrap(await request
                    .order('created_at', { ascending: false })
                    .limit(200)) ?? []) as Json[])
                    .filter(isPublicProfile),
                terms,
                (row) => businessSearchBlob(row, categoryNames),
            );
            const ordered = ordering === 'name'
                ? [...matched].sort((left, right) => (
                    String(left.display_name || '').localeCompare(
                        String(right.display_name || ''),
                    )
                ))
                : matched;
            const page = ordered.slice(offset, offset + limit);
            const profiles = await Promise.all(
                page.map((row) => mapProfile(supabase, row, false)),
            );
            return {
                profiles,
                count: ordered.length,
                limit,
                offset,
                ordering,
            };
        }

        const openRows = ((unwrap(await request
            .order('created_at', { ascending: false })
            .limit(200)) ?? []) as Json[])
            .filter(isPublicProfile);
        const page = openRows.slice(offset, offset + limit);
        const profiles = await Promise.all(page.map((row) => mapProfile(supabase, row, false)));
        return {
            profiles,
            count: openRows.length,
            limit,
            offset,
            ordering,
        };
    }

    if (parts[1] === 'public' && parts[2] === 'profiles' && parts[3] && method === 'GET') {
        const business = await anyBusiness(supabase, parts[3]);
        if (parts[4] === 'catalogs') {
            return {
                commercial_profile_id: business.id,
                catalogs: catalogsOf(business)
                    .filter((catalog) => catalog.status !== 'archived')
                    .map((catalog) => mapCatalog(String(business.id), catalog)),
            };
        }
        if (parts[4] === 'offers') {
            const isOwner = String(business.owner_id || '') === userId;
            if (!isOwner && !isBusinessRowOpenNow(business)) {
                return {
                    commercial_profile_id: business.id,
                    offers: [],
                    count: 0,
                    limit,
                    offset,
                };
            }

            const rows = (unwrap(await supabase
                .from('offers')
                .select('*')
                .eq('business_id', business.id)
                .is('archived_at', null)) ?? []) as Json[];
            const offers = await Promise.all(
                rows.filter((row) => offerIsAvailableToCustomers(row))
                    .map((row) => mapPublicOffer(supabase, row)),
            );
            return {
                commercial_profile_id: business.id,
                offers,
                count: offers.length,
                limit,
                offset,
            };
        }
        return { profile: await mapProfile(supabase, business, false) };
    }

    if (parts[1] === 'profiles' && method === 'GET' && !parts[2]) {
        const rows = (unwrap(await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })) ?? []) as Json[];
        return {
            profiles: await Promise.all(rows.map((row) => mapProfile(supabase, row, true))),
        };
    }

    if (parts[1] === 'profiles' && method === 'POST' && !parts[2]) {
        const created = unwrap(await supabase
            .from('businesses')
            .insert({
                owner_id: userId,
                offer_type: payload.offer_type || 'mixed',
                category_id: Array.isArray(payload.category_ids) ? payload.category_ids[0] ?? null : null,
                category_ids: payload.category_ids || [],
                display_name: payload.display_name,
                description: payload.description || '',
                custom_activity_text: payload.custom_activity_text ?? null,
                country_code: payload.country_code ?? null,
                city: payload.city || '',
                address: payload.address ?? null,
                neighborhood: payload.neighborhood ?? null,
                location_reference: payload.location_reference ?? null,
                is_address_public: payload.is_address_public === true,
                phone_dial_code: payload.phone_dial_code ?? null,
                phone_number: payload.phone_number ?? null,
                is_phone_public: payload.is_phone_public === true,
                public_email: payload.public_email ?? null,
                is_email_public: payload.is_email_public === true,
                logo_file_id: payload.logo_file_id ?? null,
                modalities: payload.modalities || [],
                hours: payload.hours || [],
                social_links: payload.social_links || [],
                publication_status: 'draft',
            })
            .select('*')
            .single()) as Json;
        return { profile: await mapProfile(supabase, created, true) };
    }

    if (parts[1] === 'profiles' && parts[2]) {
        const businessId = parts[2];

        if (parts[3] === 'chat' && method === 'POST') {
            const conversationId = String(unwrap(await supabase.rpc('create_business_chat', {
                p_business_id: businessId,
            })));
            return {
                conversation_id: conversationId,
                commercial_profile_id: businessId,
                client_profile_id: userId,
                created: true,
            };
        }

        const business = parts[3] === 'chat'
            ? await anyBusiness(supabase, businessId)
            : await ownedBusiness(supabase, userId, businessId);

        if (!parts[3] && method === 'GET') {
            return { profile: await mapProfile(supabase, business, true) };
        }

        if (parts[3] === 'deletion-status' && method === 'GET') {
            return await getBusinessDeletionStatus(supabase, businessId);
        }

        if (!parts[3] && method === 'DELETE') {
            await deleteOwnedBusiness(supabase, userId, businessId);
            return undefined;
        }

        if (!parts[3] && method === 'PATCH') {
            const patch: Json = {};
            for (const key of [
                'display_name', 'description', 'custom_activity_text', 'country_code', 'city',
                'address', 'neighborhood', 'location_reference', 'is_address_public',
                'phone_dial_code', 'phone_number', 'is_phone_public', 'public_email',
                'is_email_public', 'logo_file_id', 'offer_type', 'modalities', 'hours',
                'social_links', 'is_public', 'is_available', 'cash_on_delivery_enabled',
                'delivery_fee_mode', 'delivery_fee_amount', 'timezone',
                'booking_hold_minutes', 'inventory_hold_minutes',
                'delivery_currency_code',
            ]) {
                if (key in payload) patch[key] = payload[key];
            }
            for (const key of ['booking_hold_minutes', 'inventory_hold_minutes']) {
                if (!(key in patch)) continue;
                const minutes = Number(patch[key]);
                if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
                    throw new GatewayError(
                        'El tiempo de apartado debe estar entre 5 y 240 minutos.',
                        400,
                    );
                }
                patch[key] = minutes;
            }
            if ('delivery_currency_code' in patch) {
                const currencyCode = String(patch.delivery_currency_code || '')
                    .trim()
                    .toUpperCase();
                if (!/^[A-Z]{3}$/.test(currencyCode)) {
                    throw new GatewayError(
                        'La moneda debe tener tres letras, por ejemplo COP.',
                        400,
                    );
                }
                patch.delivery_currency_code = currencyCode;
            }
            if (Array.isArray(payload.category_ids)) {
                patch.category_ids = payload.category_ids;
                patch.category_id = payload.category_ids[0] ?? null;
            }
            const saved = await saveBusiness(supabase, businessId, patch);
            return { profile: await mapProfile(supabase, saved, true) };
        }

        if (parts[3] === 'publication' && method === 'PATCH') {
            const saved = await saveBusiness(supabase, businessId, {
                publication_status: payload.publication_status || payload.status || 'published',
                is_public: (payload.publication_status || payload.status) === 'published',
            });
            return { profile: await mapProfile(supabase, saved, true) };
        }

        if (parts[3] === 'verification') {
            const current = asJson(business.verification);
            if (method === 'GET' && !parts[4]) {
                return {
                    request: Object.keys(current).length ? current : null,
                    verification_status: business.verification_status,
                };
            }
            if (method === 'POST' && !parts[4]) {
                const request = {
                    ...current,
                    id: current.id || createId(),
                    commercial_profile_id: businessId,
                    status: 'draft',
                    applicant_type: payload.applicant_type,
                    legal_name: payload.legal_name,
                    tax_id: payload.tax_id,
                    business_address: payload.business_address,
                    review_note: payload.review_note ?? null,
                    declaration_accepted_at: new Date().toISOString(),
                    declaration_version: payload.declaration_version,
                    is_editable: true,
                    updated_at: new Date().toISOString(),
                    created_at: current.created_at || new Date().toISOString(),
                };
                const saved = await saveBusiness(supabase, businessId, {
                    verification: request,
                    verification_status: 'draft',
                });
                return { request: asJson(saved.verification) };
            }
            if (parts[4] === 'submit' && method === 'POST') {
                const request = {
                    ...current,
                    status: 'pending_review',
                    submitted_at: new Date().toISOString(),
                    reviewed_at: null,
                    review_reason_code: null,
                    review_reason_text: null,
                    is_editable: false,
                };
                const saved = await saveBusiness(supabase, businessId, {
                    verification: request,
                    verification_status: 'pending_review',
                    verification_badge_visible: false,
                });
                return { request: asJson(saved.verification) };
            }
            if (parts[4] === 'document' && method === 'POST') {
                const request = {
                    ...current,
                    document: {
                        id: createId(),
                        file_id: payload.file_id,
                        note: payload.note ?? null,
                        status: 'active',
                        created_at: new Date().toISOString(),
                    },
                };
                const saved = await saveBusiness(supabase, businessId, { verification: request });
                return { request: asJson(saved.verification) };
            }
        }

        if (parts[3] === 'catalogs') {
            const catalogs = catalogsOf(business);
            if (!parts[4] && method === 'GET') {
                const includeArchived = query.get('include_archived') === 'true';
                const visibleCatalogs = includeArchived
                    ? catalogs
                    : catalogs.filter((catalog) => (
                        catalog.status !== 'archived'
                        && !catalog.archived_at
                    ));
                return {
                    commercial_profile_id: businessId,
                    catalogs: visibleCatalogs.map((catalog) => mapCatalog(businessId, catalog)),
                };
            }
            if (!parts[4] && method === 'POST') {
                const now = new Date().toISOString();
                const catalog = {
                    id: createId(),
                    name: payload.name,
                    description: payload.description ?? null,
                    sort_order: Number(payload.sort_order || catalogs.length),
                    status: 'published',
                    created_at: now,
                    updated_at: now,
                };
                const saved = await saveBusiness(supabase, businessId, {
                    catalogs: [...catalogs, catalog],
                });
                return { catalog: mapCatalog(businessId, catalog && saved ? catalog : catalog) };
            }
            const catalog = catalogs.find((item) => item.id === parts[4]);
            if (!catalog) throw new GatewayError('No encontramos el catálogo.', 404);
            if (method === 'GET') return { catalog: mapCatalog(businessId, catalog) };
            if (method === 'PATCH') {
                Object.assign(catalog, payload, { updated_at: new Date().toISOString() });
            }
            if (method === 'POST' && parts[5]) {
                const status = parts[5] === 'pause'
                    ? 'paused'
                    : parts[5] === 'archive'
                        ? 'archived'
                        : 'published';
                catalog.status = status;
                catalog.archived_at = status === 'archived' ? new Date().toISOString() : null;
                catalog.updated_at = new Date().toISOString();
            }
            await saveBusiness(supabase, businessId, { catalogs });
            return { catalog: mapCatalog(businessId, catalog) };
        }

        if (parts[3] === 'offers') {
            if (!parts[4] && method === 'GET') {
                const rows = (unwrap(await supabase
                    .from('offers')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('sort_order')) ?? []) as Json[];
                return {
                    commercial_profile_id: businessId,
                    offers: await Promise.all(rows.map((row) => mapOwnedOffer(supabase, row))),
                };
            }
            if (!parts[4] && method === 'POST') {
                const created = unwrap(await supabase
                    .from('offers')
                    .insert({
                        business_id: businessId,
                        catalog: payload.catalog_id,
                        offer_kind: payload.offer_kind || 'product',
                        title: payload.title,
                        description: payload.description ?? null,
                        pricing_strategy: payload.pricing_strategy || 'fixed',
                        base_price_amount: payload.base_price_amount ?? null,
                        original_price_amount: payload.original_price_amount ?? null,
                        discount_percent: payload.discount_percent ?? null,
                        currency_code: payload.currency_code || 'COP',
                        modalities: payload.modalities || [],
                        duration_minutes: payload.duration_minutes ?? null,
                        requires_booking: payload.requires_booking === true,
                        payment_policy: payload.payment_policy ?? null,
                        track_inventory: payload.track_inventory === true,
                        stock_quantity: payload.stock_quantity ?? null,
                        status: payload.status === 'paused' ? 'paused' : 'published',
                    })
                    .select('*')
                    .single()) as Json;
                return { offer: await mapOwnedOffer(supabase, created) };
            }

            const offer = unwrap(await supabase
                .from('offers')
                .select('*')
                .eq('id', parts[4])
                .eq('business_id', businessId)
                .maybeSingle()) as Json | null;
            if (!offer) throw new GatewayError('No encontramos la oferta.', 404);

            if (!parts[5] && method === 'GET') {
                return { offer: await mapOwnedOffer(supabase, offer) };
            }
            if (parts[5] === 'deletion-status' && method === 'GET') {
                return await getOfferDeletionStatus(
                    supabase,
                    businessId,
                    String(offer.id),
                );
            }
            if (!parts[5] && method === 'DELETE') {
                await deleteOwnedOfferRecord(
                    supabase,
                    businessId,
                    String(offer.id),
                );
                return undefined;
            }
            if (!parts[5] && method === 'PATCH') {
                const patch: Json = {};
                for (const key of [
                    'title', 'description', 'pricing_strategy', 'base_price_amount',
                    'original_price_amount', 'discount_percent',
                    'currency_code', 'duration_minutes', 'requires_booking',
                    'payment_policy', 'is_available', 'sort_order', 'track_inventory',
                    'stock_quantity',
                ]) {
                    if (key in payload) patch[key] = payload[key];
                }
                if ('catalog_id' in payload) patch.catalog = payload.catalog_id;
                if ('offer_kind' in payload) patch.offer_kind = payload.offer_kind;
                const saved = unwrap(await supabase
                    .from('offers')
                    .update(patch)
                    .eq('id', offer.id)
                    .select('*')
                    .single()) as Json;
                return { offer: await mapOwnedOffer(supabase, saved) };
            }

            if (parts[5] === 'modalities' && method === 'PATCH') {
                const saved = unwrap(await supabase
                    .from('offers')
                    .update({ modalities: payload.modalities || [] })
                    .eq('id', offer.id)
                    .select('*')
                    .single()) as Json;
                return { offer: await mapOwnedOffer(supabase, saved) };
            }

            if (parts[5] === 'inventory' && method === 'POST') {
                const next = Number(offer.stock_quantity || 0) + Number(payload.delta || payload.quantity || 0);
                const saved = unwrap(await supabase
                    .from('offers')
                    .update({ stock_quantity: next, track_inventory: true })
                    .eq('id', offer.id)
                    .select('*')
                    .single()) as Json;
                return { offer: await mapOwnedOffer(supabase, saved) };
            }

            if (parts[5] && ['pause', 'publish', 'archive', 'restore', 'enable', 'disable'].includes(parts[5])) {
                const patch: Json = {};
                if (parts[5] === 'pause') patch.status = 'paused';
                if (parts[5] === 'publish' || parts[5] === 'restore') {
                    patch.status = 'published';
                    patch.archived_at = null;
                    patch.is_available = true;
                }
                if (parts[5] === 'archive') {
                    patch.status = 'archived';
                    patch.archived_at = new Date().toISOString();
                    patch.is_available = false;
                }
                if (parts[5] === 'enable') patch.is_available = true;
                if (parts[5] === 'disable') patch.is_available = false;
                const saved = unwrap(await supabase
                    .from('offers')
                    .update(patch)
                    .eq('id', offer.id)
                    .select('*')
                    .single()) as Json;
                return { offer: await mapOwnedOffer(supabase, saved) };
            }

            if (parts[5] === 'images') {
                const images = asRows<Json>(offer.images);
                if (!parts[6] && method === 'POST') {
                    const image = {
                        id: createId(),
                        file_id: payload.file_id,
                        display_name: payload.display_name ?? null,
                        mime_type: payload.mime_type ?? null,
                        sort_order: images.length,
                        is_primary: images.length === 0,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    const saved = unwrap(await supabase
                        .from('offers')
                        .update({ images: [...images, image] })
                        .eq('id', offer.id)
                        .select('*')
                        .single()) as Json;
                    const mapped = await mapImages(supabase, asRows<Json>(saved.images));
                    return { image: mapped.find((item) => item.id === image.id) };
                }
                const image = images.find((item) => item.id === parts[6]);
                if (!image) throw new GatewayError('No encontramos la imagen.', 404);
                if (method === 'DELETE') {
                    await supabase.from('offers').update({
                        images: images.filter((item) => item.id !== image.id),
                    }).eq('id', offer.id);
                    return undefined;
                }
                if (method === 'PATCH') Object.assign(image, payload);
                if (parts[7] === 'archive') {
                    image.status = 'archived';
                    image.archived_at = new Date().toISOString();
                }
                if (parts[7] === 'restore') {
                    image.status = 'active';
                    image.archived_at = null;
                }
                if (parts[7] === 'set-primary') {
                    images.forEach((item) => {
                        item.is_primary = item.id === image.id;
                    });
                }
                const saved = unwrap(await supabase
                    .from('offers')
                    .update({ images })
                    .eq('id', offer.id)
                    .select('*')
                    .single()) as Json;
                const mapped = await mapImages(supabase, asRows<Json>(saved.images));
                return { image: mapped.find((item) => item.id === image.id) };
            }
        }

        if (parts[3] === 'payment-methods') {
            const methods = paymentMethodsOf(business);
            if (!parts[4] && method === 'GET') {
                return { commercial_profile_id: businessId, payment_methods: methods };
            }
            if (!parts[4] && method === 'POST') {
                const methodRow = {
                    id: createId(),
                    ...payload,
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                await saveBusiness(supabase, businessId, {
                    payment_methods: [...methods, methodRow],
                });
                return { payment_method: methodRow };
            }
            const methodRow = methods.find((item) => item.id === parts[4]);
            if (!methodRow) throw new GatewayError('No encontramos el método de pago.', 404);
            if (method === 'GET') return { payment_method: methodRow };
            if (method === 'DELETE') {
                await saveBusiness(supabase, businessId, {
                    payment_methods: methods.filter((item) => item.id !== methodRow.id),
                });
                return undefined;
            }
            if (method === 'PATCH') Object.assign(methodRow, payload);
            if (parts[5] === 'archive') methodRow.status = 'archived';
            methodRow.updated_at = new Date().toISOString();
            await saveBusiness(supabase, businessId, { payment_methods: methods });
            return { payment_method: methodRow };
        }

        if (parts[3] === 'metrics' && method === 'GET') {
            const grain = String(query.get('grain') || 'month').trim().toLowerCase();
            const anchor = String(query.get('anchor') || '').trim();

            if (!['day', 'week', 'month'].includes(grain)) {
                throw new GatewayError(
                    'El periodo debe ser día, semana o mes.',
                    400,
                );
            }

            const rpcResult = await supabase.rpc('get_business_sales_metrics', {
                p_business_id: businessId,
                p_grain: grain,
                p_anchor: anchor || null,
            });

            if (rpcResult.error) {
                throw new GatewayError(
                    rpcResult.error.message || 'No fue posible cargar las métricas.',
                    400,
                );
            }

            return rpcResult.data;
        }

        if (parts[3] === 'requests' && method === 'GET') {
            const rows = (await loadOrders(supabase))
                .filter((row) => row.business_id === businessId);
            return pageRequests(rows, query, limit, offset);
        }
    }

    if (parts[1] === 'requests' && method === 'POST' && !parts[2]) {
        const key = headerValue(headers, 'Idempotency-Key') || String(payload.idempotency_key || '');
        if (key) {
            const existing = unwrap(await supabase
                .from('orders')
                .select('*')
                .eq('customer_id', userId)
                .eq('idempotency_key', key)
                .maybeSingle()) as Json | null;
            if (existing) {
                return {
                    request: {
                        request_id: existing.id,
                        code: existing.code,
                        status: existing.status,
                        idempotent: true,
                    },
                    idempotent: true,
                };
            }
        }

        const targetBusiness = await anyBusiness(
            supabase,
            String(payload.commercial_profile_id || ''),
        );
        if (!isBusinessRowOpenNow(targetBusiness)) {
            throw new GatewayError(
                'Este negocio se encuentra fuera de su horario de atención en este momento.',
                409,
            );
        }

        const items = Array.isArray(payload.items) ? payload.items as Json[] : [];
        for (const item of items) {
            const requestedStartsAt = String(item.requested_starts_at || '').trim();
            if (requestedStartsAt) {
                const check = validateReservationIsoAgainstBusinessHours({
                    rawHours: targetBusiness.hours,
                    timezone: targetBusiness.timezone,
                    startsAtIso: requestedStartsAt,
                });
                if (!check.ok) {
                    throw new GatewayError(check.message, 400);
                }
            }
        }
        const offerIds = items.map((item) => String(item.commercial_offer_id || '')).filter(Boolean);
        const offers = offerIds.length
            ? (unwrap(await supabase
                .from('offers')
                .select('*')
                .in('id', offerIds)) ?? []) as Json[]
            : [];
        const byId = new Map(offers.map((offer) => [String(offer.id), offer]));
        for (const item of items) {
            const offerId = String(item.commercial_offer_id || '').trim();
            if (!offerId) continue;
            const offer = byId.get(offerId);
            if (!offer || !offerIsAvailableToCustomers(offer)) {
                throw new GatewayError(
                    'Este producto o servicio ya no está disponible.',
                    409,
                );
            }
        }
        let subtotal = 0;
        const storedItems = items.map((item, index) => {
            const offer = byId.get(String(item.commercial_offer_id || ''));
            const quantity = Number(item.quantity || 1);
            const unit = offer?.base_price_amount == null ? null : Number(offer.base_price_amount);
            const line = unit == null ? null : unit * quantity;
            if (line) subtotal += line;
            return {
                id: createId(),
                commercial_offer_id: item.commercial_offer_id,
                sort_order: index,
                quantity,
                offer_kind: offer?.offer_kind || 'product',
                title: offer?.title || 'Oferta',
                description: offer?.description ?? null,
                pricing_strategy: offer?.pricing_strategy || 'fixed',
                unit_price_amount: unit,
                currency_code: 'COP',
                modality: item.requested_modality ?? null,
                requested_starts_at: item.requested_starts_at ?? null,
                duration_minutes: offer?.duration_minutes ?? null,
                requires_booking: offer?.requires_booking === true,
                payment_policy: offer?.payment_policy ?? null,
                line_total_amount: line,
                offer_snapshot: offer || {},
                original_terms: {
                    requested_starts_at: item.requested_starts_at ?? null,
                    requested_ends_at: item.requested_ends_at ?? null,
                    timezone: item.timezone ?? null,
                },
                lifecycle_status: 'open',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        });
        const created = unwrap(await supabase
            .from('orders')
            .insert({
                business_id: payload.commercial_profile_id,
                customer_id: userId,
                status: 'submitted',
                request_type: payload.request_type || 'product_order',
                code: createId().slice(0, 8).toUpperCase(),
                requested_modality: payload.requested_modality ?? null,
                customer_note: payload.customer_note ?? null,
                delivery_address: payload.delivery_address ?? null,
                delivery_reference: payload.delivery_reference ?? null,
                currency_code: payload.currency_code || 'COP',
                subtotal_amount: subtotal,
                total_amount: subtotal,
                items: storedItems,
                history: [{
                    id: createId(),
                    action: 'created',
                    at: new Date().toISOString(),
                    status: 'submitted',
                }],
                idempotency_key: key || null,
            })
            .select('*')
            .single()) as Json;

        return {
            request: {
                request_id: created.id,
                code: created.code,
                status: created.status,
                idempotent: false,
            },
            idempotent: false,
        };
    }

    if (parts[1] === 'requests' && method === 'GET' && !parts[2]) {
        return pageRequests(await loadOrders(supabase), query, limit, offset);
    }

    if (parts[1] === 'requests' && parts[2]) {
        const order = await orderById(supabase, parts[2]);
        const mapped = mapOrder(order);
        const business = await anyBusiness(supabase, String(order.business_id));
        const role = order.customer_id === userId ? 'customer' : 'business';
        const requestPermissions = permissions(role, order);
        const submittedProof = asRows<Json>(order.payment_proofs)
            .find((proof) => proof.status === 'submitted');

        if (!parts[3] && method === 'GET') return { request: mapped };

        if (parts[3] === 'timeline' && method === 'GET') {
            return {
                events: asRows<Json>(order.history).map((event) => ({
                    id: event.id,
                    type: event.action,
                    at: event.at,
                    status: event.status,
                })),
            };
        }

        if (parts[3] === 'formal-detail' && method === 'GET') {
            return {
                request: mapped,
                context: {
                    actor_role: role === 'customer' ? 'customer' : 'business_owner',
                    business: {
                        id: business.id,
                        display_name: business.display_name,
                        logo_file_id: business.logo_file_id ?? null,
                    },
                    permissions: requestPermissions,
                    timeline: { events: asRows(order.history) },
                    payment_proofs: asRows(order.payment_proofs),
                    payment_attempts: {
                        attempts_used: asRows(order.payment_proofs).length,
                        attempts_remaining: 3,
                        max_attempts: 3,
                        active_submitted_proof_id: submittedProof?.id ?? null,
                        can_submit_payment_proof: requestPermissions.can_submit_payment_proof === true,
                        can_replace_payment_proof: requestPermissions.can_replace_payment_proof === true,
                        is_exhausted: false,
                        cancelled_after_max_attempts: false,
                    },
                    reservation: order.reservation ?? null,
                    payment_options: {
                        commerce_request_id: order.id,
                        request_status: order.status,
                        payment_eligible: true,
                        cash_on_delivery_available: business.cash_on_delivery_enabled === true,
                        attempts_used: asRows(order.payment_proofs).length,
                        attempts_remaining: 3,
                        max_attempts: 3,
                        active_submitted_proof_id: submittedProof?.id ?? null,
                        can_submit_payment_proof: requestPermissions.can_submit_payment_proof === true,
                        manual_payment_methods: paymentMethodsOf(business),
                    },
                    dispute: order.dispute ?? null,
                },
            };
        }

        if (parts[3] === 'payment-methods' && method === 'GET') {
            return { payment_methods: paymentMethodsOf(business) };
        }

        if (parts[3] === 'transition' && method === 'POST') {
            const currentStatus = String(order.status || '');
            if (!orderIsOpen(currentStatus)) {
                throw new GatewayError(
                    currentStatus === 'completed'
                        ? 'Un pago ya confirmado no se puede cancelar desde aquí.'
                        : 'Esta solicitud ya no se puede cambiar.',
                    409,
                );
            }
            const action = String(payload.action || '');
            if (
                (action === 'start_review' || action === 'accept' || action === 'reject')
                && role !== 'business'
            ) {
                throw new GatewayError('Solo el negocio puede hacer este cambio.', 403);
            }
            if (action === 'cancel' && role !== 'customer' && role !== 'business') {
                throw new GatewayError('No puedes cancelar esta solicitud.', 403);
            }
            const next = action === 'start_review'
                ? 'under_review'
                : action === 'accept'
                    ? 'accepted'
                    : action === 'reject'
                        ? 'rejected'
                        : 'cancelled';
            const saved = await mutateOrder(supabase, order, { status: next }, action || 'cancel');
            return {
                request: {
                    request_id: saved.id,
                    status: saved.status,
                    previous_status: order.status,
                    action: action || 'cancel',
                },
            };
        }

        if (parts[3] === 'proposals' && method === 'POST') {
            const proposals = asRows<Json>(order.proposals);
            const proposal = {
                id: createId(),
                ...payload,
                status: 'sent',
                created_at: new Date().toISOString(),
            };
            const saved = await mutateOrder(supabase, order, {
                proposals: [...proposals, proposal],
                status: 'proposal_sent',
            }, 'proposal');
            return { proposal, request: mapOrder(saved) };
        }

        if (parts[3] === 'reservation-hold' && method === 'POST') {
            const reservation = {
                id: createId(),
                commerce_request_id: order.id,
                commercial_profile_id: order.business_id,
                status: 'hold',
                ...payload,
                hold_started_at: new Date().toISOString(),
            };
            const saved = await mutateOrder(supabase, order, { reservation }, 'reservation-hold');
            return { reservation, request: mapOrder(saved) };
        }

        if (parts[3] === 'complete' && method === 'POST') {
            throw new GatewayError(
                'El ingreso se registra al confirmar que el pago fue recibido.',
                409,
            );
        }

        if (parts[3] === 'confirm-payment' && method === 'POST') {
            if (role !== 'business') {
                throw new GatewayError('Solo quien recibe el pago puede confirmarlo.', 403);
            }
            if (!orderIsOpen(String(order.status || ''))) {
                throw new GatewayError('Esta solicitud ya no admite confirmación de pago.', 409);
            }
            const gate = paymentConfirmationGate(order);
            if (!gate.ready) {
                throw new GatewayError(
                    'Podrás confirmar el pago cuando llegue la fecha y hora del servicio.',
                    409,
                );
            }
            const confirmedAt = new Date().toISOString();
            const proofs = asRows<Json>(order.payment_proofs).map((proof) => (
                proof.status === 'submitted'
                    ? { ...proof, status: 'confirmed', confirmed_at: confirmedAt }
                    : proof
            ));
            const saved = await mutateOrder(supabase, order, {
                status: 'completed',
                payment_proofs: proofs,
            }, 'complete');
            return { request: mapOrder(saved) };
        }

        if (parts[3] === 'payment-proofs' && method === 'POST') {
            if (role !== 'customer') {
                throw new GatewayError('Solo quien paga puede enviar el comprobante.', 403);
            }
            if (!orderIsOpen(String(order.status || ''))) {
                throw new GatewayError('Esta solicitud ya no admite comprobantes.', 409);
            }
            const proofs = asRows<Json>(order.payment_proofs);
            if (proofs.some((proof) => proof.status === 'submitted')) {
                throw new GatewayError('Ya hay un comprobante en revisión.', 409);
            }
            const proof = {
                id: createId(),
                ...payload,
                status: 'submitted',
                created_at: new Date().toISOString(),
            };
            const saved = await mutateOrder(supabase, order, {
                payment_proofs: [...proofs, proof],
                status: 'payment_submitted',
            }, 'payment-proof');
            return { payment_proof: proof, request: mapOrder(saved) };
        }
    }

    if (parts[1] === 'proposals' && parts[2]) {
        const found = findOrderWith(await loadOrders(supabase), 'proposals', parts[2]);
        if (!found) throw new GatewayError('No encontramos la propuesta.', 404);
        const proposals = asRows<Json>(found.order.proposals).map((item) => (
            item.id === parts[2]
                ? { ...item, status: parts[3] || item.status, ...payload }
                : item
        ));
        const status = parts[3] === 'accept' ? 'accepted' : found.order.status;
        const saved = await mutateOrder(supabase, found.order, { proposals, status }, parts[3] || 'proposal');
        return { proposal: proposals.find((item) => item.id === parts[2]), request: mapOrder(saved) };
    }

    if (parts[1] === 'payment-proofs' && parts[2]) {
        const found = findOrderWith(await loadOrders(supabase), 'payment_proofs', parts[2]);
        if (!found) throw new GatewayError('No encontramos el comprobante.', 404);
        const proofRole = found.order.customer_id === userId ? 'customer' : 'business';
        if (parts[3] === 'access' && method === 'GET') {
            const fileId = found.entry.file_id;
            const file = unwrap(await supabase
                .from('files')
                .select('*')
                .eq('id', fileId)
                .single()) as Json;
            const signed = await supabase.storage
                .from(String(file.bucket))
                .createSignedUrl(String(file.path), SIGNED_URL_SECONDS);
            if (signed.error || !signed.data?.signedUrl) {
                throw new GatewayError('No fue posible abrir el comprobante.', 400);
            }
            const fileName = String(file.name || file.original_name || 'comprobante');
            return {
                payment_proof_id: parts[2],
                file: {
                    id: file.id,
                    display_name: fileName,
                    original_name: fileName,
                    mime_type: String(file.mime_type || 'application/octet-stream'),
                    size_bytes: Number(file.size_bytes || 0),
                },
                url: signed.data.signedUrl,
                expires_in_seconds: SIGNED_URL_SECONDS,
                download: query.get('download') === 'true',
            };
        }
        if (parts[3] === 'replace' && method === 'POST') {
            if (proofRole !== 'customer') {
                throw new GatewayError('Solo quien paga puede reemplazar el comprobante.', 403);
            }
            if (!orderIsOpen(String(found.order.status || ''))) {
                throw new GatewayError('Esta solicitud ya no admite comprobantes.', 409);
            }
            if (found.entry.status !== 'rejected') {
                throw new GatewayError('Solo puedes reemplazar un comprobante rechazado.', 409);
            }
            const existingProofs = asRows<Json>(found.order.payment_proofs);
            if (existingProofs.some((proof) => proof.status === 'submitted')) {
                throw new GatewayError('Ya hay un comprobante en revisión.', 409);
            }
            const fileId = String(payload.file_id || '').trim();
            if (!fileId) {
                throw new GatewayError('Adjunta el comprobante corregido.', 400);
            }
            const proofs = existingProofs.map((item) => (
                item.id === parts[2]
                    ? {
                        ...item,
                        file_id: fileId,
                        status: 'submitted',
                        rejection_reason: null,
                        rejected_at: null,
                    }
                    : item
            ));
            const saved = await mutateOrder(supabase, found.order, {
                payment_proofs: proofs,
                status: 'payment_submitted',
            }, 'payment-proof');
            return {
                payment_proof: proofs.find((item) => item.id === parts[2]),
                request: mapOrder(saved),
            };
        }
        if (parts[3] === 'review' && method === 'POST') {
            if (proofRole !== 'business') {
                throw new GatewayError('Solo quien recibe el pago puede revisar el comprobante.', 403);
            }
            if (!orderIsOpen(String(found.order.status || ''))) {
                throw new GatewayError('Esta solicitud ya no admite revisión del comprobante.', 409);
            }
            const decision = String(payload.decision || '');
            if (decision !== 'confirmed' && decision !== 'rejected') {
                throw new GatewayError('Indica si confirmas o rechazas el comprobante.', 400);
            }
            if (decision === 'rejected' && !String(payload.rejection_reason || '').trim()) {
                throw new GatewayError('Indica el motivo del rechazo.', 400);
            }
            if (found.entry.status !== 'submitted') {
                throw new GatewayError('Este comprobante ya fue revisado.', 409);
            }
            const reviewedAt = new Date().toISOString();
            const proofs = asRows<Json>(found.order.payment_proofs).map((item) => (
                item.id === parts[2]
                    ? {
                        ...item,
                        status: decision,
                        rejection_reason: decision === 'rejected'
                            ? String(payload.rejection_reason || '').trim()
                            : null,
                        rejected_at: decision === 'rejected' ? reviewedAt : null,
                        confirmed_at: decision === 'confirmed' ? reviewedAt : item.confirmed_at ?? null,
                    }
                    : item
            ));
            const saved = await mutateOrder(
                supabase,
                found.order,
                { payment_proofs: proofs },
                'payment-proof',
            );
            return {
                payment_proof: proofs.find((item) => item.id === parts[2]),
                request: mapOrder(saved),
            };
        }
    }

    if (parts[1] === 'request-items' && parts[2]) {
        const found = findOrderWith(await loadOrders(supabase), 'items', parts[2]);
        if (!found) throw new GatewayError('No encontramos el ítem.', 404);
        const items = asRows<Json>(found.order.items).map((item) => (
            item.id === parts[2]
                ? { ...item, ...payload, lifecycle_status: parts[3] || item.lifecycle_status }
                : item
        ));
        const saved = await mutateOrder(supabase, found.order, { items }, parts[3] || 'item');
        return { item: items.find((item) => item.id === parts[2]), request: mapOrder(saved) };
    }

    if (parts[1] === 'item-proposals' && parts[2]) {
        const orders = await loadOrders(supabase);
        for (const order of orders) {
            const items = asRows<Json>(order.items);
            const item = items.find((entry) => asRows<Json>(entry.proposals).some((proposal) => proposal.id === parts[2]));
            if (!item) continue;
            item.proposals = asRows<Json>(item.proposals).map((proposal) => (
                proposal.id === parts[2]
                    ? { ...proposal, status: parts[3] || proposal.status }
                    : proposal
            ));
            const saved = await mutateOrder(supabase, order, { items }, parts[3] || 'item-proposal');
            return { item, request: mapOrder(saved) };
        }
        throw new GatewayError('No encontramos la propuesta del ítem.', 404);
    }

    throw new GatewayError(
        `Ruta comercial aún no disponible en Supabase: ${path}`,
        501,
    );
}

function pageRequests(
    rows: Json[],
    query: URLSearchParams,
    limit: number,
    offset: number,
): Json {
    const statuses = query.getAll('status').filter(Boolean);
    const filtered = rows.filter((row) => (
        statuses.length ? statuses.includes(String(row.status)) : true
    ));
    const page = filtered.slice(offset, offset + limit).map(mapOrder);

    return {
        requests: page,
        count: page.length,
        limit,
        offset,
    };
}
