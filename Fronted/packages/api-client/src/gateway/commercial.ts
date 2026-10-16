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

function partsOf(path: string): string[] {
    return path.split('/').filter(Boolean);
}

function publishedOffer(status: unknown): boolean {
    const value = String(status || '');
    return value === 'published' || value === 'active';
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

async function publishedBusinessRows(
    supabase: SupabaseClient,
): Promise<Json[]> {
    return (unwrap(await supabase
        .from('businesses')
        .select('*')
        .eq('is_public', true)
        .eq('publication_status', 'published')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(200)) ?? []) as Json[];
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

function uniqueNestedBusinesses(rows: Json[]): Json[] {
    const profiles = rows.map((row) => asJson(row.businesses));

    return Array.from(new Map(
        profiles.map((profile) => [String(profile.id), profile]),
    ).values());
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
        base_price_amount: row.base_price_amount ?? null,
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

function permissions(role: 'customer' | 'business', status: string): Json {
    const open = !['completed', 'rejected', 'cancelled', 'expired'].includes(status);
    const business = role === 'business';

    return {
        can_start_review: business && status === 'submitted',
        can_accept: business && open,
        can_reject: business && open,
        can_cancel: open,
        can_create_proposal: business && open,
        can_accept_proposal: role === 'customer' && open,
        can_reject_proposal: role === 'customer' && open,
        can_withdraw_proposal: business && open,
        can_request_payment: business,
        can_view_payment_methods: true,
        can_submit_payment_proof: role === 'customer' && open,
        can_replace_payment_proof: role === 'customer',
        can_review_payment_proof: business,
        can_create_reservation_hold: business,
        can_complete: business && open,
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

        const categoryNames = terms.length > 0
            ? await loadCategoryNames(supabase)
            : new Map<string, string>();
        const rows = (unwrap(await supabase
            .from('offers')
            .select('*, businesses!inner(*)')
            .eq('businesses.is_public', true)
            .eq('businesses.publication_status', 'published')
            .is('businesses.archived_at', null)
            .is('archived_at', null)
            .eq('is_available', true)
            .order('created_at', { ascending: false })
            .limit(200)) ?? []) as Json[];
        const rankedOffers = rankMarketplaceRows(
            rows.filter((row) => publishedOffer(row.status)),
            terms,
            (row) => offerSearchBlob(row, categoryNames),
        );
        const offerPage = rankedOffers.slice(offset, offset + limit);
        const offers = await Promise.all(
            offerPage.map((row) => mapPublicOffer(supabase, row)),
        );
        const discoverBusinesses = terms.length > 0 || rankedOffers.length === 0;
        const rankedBusinesses = discoverBusinesses
            ? rankMarketplaceRows(
                await publishedBusinessRows(supabase),
                terms,
                (row) => businessSearchBlob(row, categoryNames),
            )
            : [];
        const profileRows = discoverBusinesses
            ? rankedBusinesses.slice(offset, offset + limit)
            : uniqueNestedBusinesses(offerPage);
        const profiles = await Promise.all(
            profileRows.map((profile) => mapProfile(supabase, profile, false)),
        );
        const profilesCount = discoverBusinesses
            ? rankedBusinesses.length
            : profileRows.length;
        const profilesHasMore = discoverBusinesses
            && offset + limit < rankedBusinesses.length;

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
        if (!row) throw new GatewayError('No encontramos la oferta.', 404);
        return { offer: await mapPublicOffer(supabase, row) };
    }

    if (parts[1] === 'public' && parts[2] === 'profiles' && method === 'GET' && !parts[3]) {
        let request = supabase
            .from('businesses')
            .select('*')
            .eq('is_public', true)
            .eq('publication_status', 'published')
            .is('archived_at', null);
        if (query.get('country_code')) request = request.eq('country_code', query.get('country_code'));
        if (query.get('city')) request = request.eq('city', query.get('city'));
        if (query.get('offer_type')) request = request.eq('offer_type', query.get('offer_type'));
        const rawSearch = (query.get('search') || '').trim();
        const terms = marketplaceSearchTerms(rawSearch);
        const verifiedOnly = query.get('verified_only') === 'true';
        const ordering = query.get('ordering') === 'name' ? 'name' : 'recent';
        const isPublicProfile = (row: Json) => (
            verifiedOnly ? row.verification_status === 'verified' : true
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

        const rows = ((unwrap(await request.range(offset, offset + limit - 1)) ?? []) as Json[])
            .filter(isPublicProfile);
        const profiles = await Promise.all(rows.map((row) => mapProfile(supabase, row, false)));
        return {
            profiles,
            count: profiles.length,
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
            const rows = (unwrap(await supabase
                .from('offers')
                .select('*')
                .eq('business_id', business.id)
                .is('archived_at', null)) ?? []) as Json[];
            const offers = await Promise.all(
                rows.filter((row) => publishedOffer(row.status))
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

        if (!parts[3] && method === 'PATCH') {
            const patch: Json = {};
            for (const key of [
                'display_name', 'description', 'custom_activity_text', 'country_code', 'city',
                'address', 'neighborhood', 'location_reference', 'is_address_public',
                'phone_dial_code', 'phone_number', 'is_phone_public', 'public_email',
                'is_email_public', 'logo_file_id', 'offer_type', 'modalities', 'hours',
                'social_links', 'is_public', 'is_available', 'cash_on_delivery_enabled',
                'delivery_fee_mode', 'delivery_fee_amount', 'timezone',
            ]) {
                if (key in payload) patch[key] = payload[key];
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
                    is_editable: false,
                };
                const saved = await saveBusiness(supabase, businessId, {
                    verification: request,
                    verification_status: 'pending_review',
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
                return {
                    commercial_profile_id: businessId,
                    catalogs: catalogs.map((catalog) => mapCatalog(businessId, catalog)),
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
                        currency_code: payload.currency_code || 'COP',
                        modalities: payload.modalities || [],
                        duration_minutes: payload.duration_minutes ?? null,
                        requires_booking: payload.requires_booking === true,
                        payment_policy: payload.payment_policy ?? null,
                        track_inventory: payload.track_inventory === true,
                        stock_quantity: payload.stock_quantity ?? null,
                        status: 'published',
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
            if (!parts[5] && method === 'PATCH') {
                const patch: Json = {};
                for (const key of [
                    'title', 'description', 'pricing_strategy', 'base_price_amount',
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
                }
                if (parts[5] === 'archive') {
                    patch.status = 'archived';
                    patch.archived_at = new Date().toISOString();
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
            if (method === 'PATCH') Object.assign(methodRow, payload);
            if (parts[5] === 'archive') methodRow.status = 'archived';
            methodRow.updated_at = new Date().toISOString();
            await saveBusiness(supabase, businessId, { payment_methods: methods });
            return { payment_method: methodRow };
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

        const items = Array.isArray(payload.items) ? payload.items as Json[] : [];
        const offerIds = items.map((item) => String(item.commercial_offer_id || '')).filter(Boolean);
        const offers = offerIds.length
            ? (unwrap(await supabase
                .from('offers')
                .select('*')
                .in('id', offerIds)) ?? []) as Json[]
            : [];
        const byId = new Map(offers.map((offer) => [String(offer.id), offer]));
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
                duration_minutes: offer?.duration_minutes ?? null,
                requires_booking: offer?.requires_booking === true,
                payment_policy: offer?.payment_policy ?? null,
                line_total_amount: line,
                offer_snapshot: offer || {},
                original_terms: {},
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
                    actor_role: role,
                    business: {
                        id: business.id,
                        display_name: business.display_name,
                        logo_file_id: business.logo_file_id ?? null,
                    },
                    permissions: permissions(role, String(order.status)),
                    timeline: { events: asRows(order.history) },
                    payment_proofs: asRows(order.payment_proofs),
                    payment_attempts: {
                        attempts_used: asRows(order.payment_proofs).length,
                        attempts_remaining: 3,
                        max_attempts: 3,
                        active_submitted_proof_id: null,
                        can_submit_payment_proof: role === 'customer',
                        can_replace_payment_proof: role === 'customer',
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
                        active_submitted_proof_id: null,
                        can_submit_payment_proof: role === 'customer',
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
            const next = payload.action === 'start_review'
                ? 'under_review'
                : payload.action === 'accept'
                    ? 'accepted'
                    : payload.action === 'reject'
                        ? 'rejected'
                        : 'cancelled';
            const saved = await mutateOrder(supabase, order, { status: next }, String(payload.action));
            return {
                request: {
                    request_id: saved.id,
                    status: saved.status,
                    previous_status: order.status,
                    action: payload.action,
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
            const saved = await mutateOrder(supabase, order, { status: 'completed' }, 'complete');
            return { request: mapOrder(saved) };
        }

        if (parts[3] === 'payment-proofs' && method === 'POST') {
            const proofs = asRows<Json>(order.payment_proofs);
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
        if (parts[3] === 'access' && method === 'GET') {
            const fileId = found.entry.file_id;
            const file = unwrap(await supabase
                .from('files')
                .select('bucket, path')
                .eq('id', fileId)
                .single()) as Json;
            const signed = await supabase.storage
                .from(String(file.bucket))
                .createSignedUrl(String(file.path), SIGNED_URL_SECONDS);
            return {
                url: signed.data?.signedUrl || null,
                expires_in_seconds: SIGNED_URL_SECONDS,
            };
        }
        const proofs = asRows<Json>(found.order.payment_proofs).map((item) => (
            item.id === parts[2] ? { ...item, ...payload, status: payload.decision || item.status } : item
        ));
        const saved = await mutateOrder(
            supabase,
            found.order,
            { payment_proofs: proofs },
            parts[3] || 'payment-proof',
        );
        return { payment_proof: proofs.find((item) => item.id === parts[2]), request: mapOrder(saved) };
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
