import type { SupabaseClient } from '@supabase/supabase-js';

import {
    GatewayError,
    unwrap,
} from './runtime';

export async function resolveOwnedBusinessId(
    supabase: SupabaseClient,
    userId: string,
    identityId: string | null | undefined,
): Promise<string | null> {
    const actingIdentityId = String(identityId || '').trim();

    if (!actingIdentityId || actingIdentityId === userId) {
        return null;
    }

    const business = unwrap(await supabase
        .from('businesses')
        .select('id')
        .eq('id', actingIdentityId)
        .eq('owner_id', userId)
        .maybeSingle());

    if (!business?.id) {
        throw new GatewayError(
            'No encontramos esa identidad de chat.',
            404,
        );
    }

    return String(business.id);
}

export async function messageSenderColumns(
    supabase: SupabaseClient,
    userId: string,
    identityId: string | null | undefined,
): Promise<{
    sender_id: string;
    sender_business_id: string | null;
}> {
    const senderBusinessId = await resolveOwnedBusinessId(
        supabase,
        userId,
        identityId,
    );

    return {
        sender_id: userId,
        sender_business_id: senderBusinessId,
    };
}
