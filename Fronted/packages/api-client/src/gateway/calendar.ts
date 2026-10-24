import {
    asJson,
    asRows,
    createId,
    GatewayError,
    type Json,
    readSettings,
    requireClient,
    searchProfiles,
    unwrap,
    } from './runtime';

const UUID = '[0-9a-f-]{36}';

function defaultPreferences(userId: string, timezone: string, now: string): Json {
    return {
        user_id: userId,
        timezone: timezone || 'America/Bogota',
        week_starts_on: 1,
        show_weekends: true,
        default_view: 'week',
        default_event_color: '#6025D2',
        default_event_kind: 'in_person',
        default_reminders: [],
        show_declined_events: false,
        notify_invitations: true,
        notify_rsvp_updates: true,
        notify_event_changes: true,
        notify_reminders: true,
        notify_sync_errors: true,
        notify_conflicts: true,
        created_at: now,
        updated_at: now,
    };
}

function mapCalendar(row: Json): Json {
    return {
        ...row,
        color: row.color || '#6025D2',
        share_permission: 'owner',
    };
}

function mapEvent(row: Json, userId: string, source = 'beeapp'): Json {
    const metadata = asJson(row.metadata);
    const attendees = asRows<Json>(row.attendees);
    const reminders = asRows<Json>(row.reminders);
    const conference = row.conference;
    const conferences = Array.isArray(conference)
        ? conference
        : conference
            ? [conference]
            : [];
    const current = attendees.find((item) => item.attendee_user_id === userId) || null;

    return {
        id: row.id,
        calendar_id: row.calendar_id,
        organizer_id: row.organizer_id,
        source: metadata.source || source,
        status: row.status || 'confirmed',
        event_kind: row.kind || 'in_person',
        custom_type_name: metadata.custom_type_name ?? null,
        title: row.title,
        description: row.description ?? null,
        color: row.color || '#6025D2',
        is_all_day: row.is_all_day === true,
        starts_at: row.starts_at ?? null,
        ends_at: row.ends_at ?? null,
        starts_on: row.starts_on ?? null,
        ends_on: row.ends_on ?? null,
        timezone: row.timezone || 'America/Bogota',
        location_name: row.location_name ?? null,
        location_address: row.location_address ?? null,
        location_maps_url: metadata.location_maps_url ?? null,
        is_private: metadata.is_private === true,
        notifications_enabled: metadata.notifications_enabled !== false,
        metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
        attendees,
        conferences,
        reminders,
        tags: Array.isArray(row.tags)
            ? row.tags.map((name) => ({ id: String(name), name: String(name) }))
            : [],
        recurrence: row.recurrence ?? null,
        viewer_permission: 'owner',
        can_edit: row.organizer_id === userId,
        can_delete: row.organizer_id === userId,
        can_manage_attendees: row.organizer_id === userId,
        current_user_attendee: current,
        current_user_response: current?.response_status ?? null,
    };
}

function eventWrite(payload: Json, userId: string): Json {
    const attendees = Array.isArray(payload.attendee_ids)
        ? payload.attendee_ids.map((id) => ({
            id: createId(),
            attendee_kind: 'user',
            attendee_user_id: id,
            external_email: null,
            external_display_name: null,
            is_organizer: id === userId,
            response_status: id === userId ? 'accepted' : 'needs_action',
            responded_at: id === userId ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }))
        : Array.isArray(payload.attendees)
            ? payload.attendees
            : undefined;

    const metadata: Json = {};
    if ('location_maps_url' in payload) metadata.location_maps_url = payload.location_maps_url;
    if ('is_private' in payload) metadata.is_private = payload.is_private === true;
    if ('notifications_enabled' in payload) {
        metadata.notifications_enabled = payload.notifications_enabled !== false;
    }
    if ('custom_type_name' in payload) metadata.custom_type_name = payload.custom_type_name;

    const row: Json = {};
    if ('calendar_id' in payload) row.calendar_id = payload.calendar_id;
    if ('title' in payload) row.title = payload.title;
    if ('description' in payload) row.description = payload.description;
    if ('event_kind' in payload) row.kind = payload.event_kind;
    if ('color' in payload) row.color = payload.color;
    if ('is_all_day' in payload) row.is_all_day = payload.is_all_day === true;
    if ('starts_at' in payload) row.starts_at = payload.starts_at;
    if ('ends_at' in payload) row.ends_at = payload.ends_at;
    if ('starts_on' in payload) row.starts_on = payload.starts_on;
    if ('ends_on' in payload) row.ends_on = payload.ends_on;
    if ('timezone' in payload) row.timezone = payload.timezone;
    if ('location_name' in payload) row.location_name = payload.location_name;
    if ('location_address' in payload) row.location_address = payload.location_address;
    if (Array.isArray(payload.tag_ids)) row.tags = payload.tag_ids;
    if ('reminders' in payload) row.reminders = payload.reminders || [];
    if ('recurrence' in payload) row.recurrence = payload.recurrence;
    if ('conferences' in payload) row.conference = payload.conferences;
    if (attendees) row.attendees = attendees;
    if (Object.keys(metadata).length) row.metadata = metadata;
    return row;
}

async function ensureDefaultCalendar(
    supabase: Awaited<ReturnType<typeof requireClient>>['supabase'],
    userId: string,
): Promise<Json[]> {
    const rows = (unwrap(await supabase
        .from('calendars')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at')) ?? []) as Json[];

    if (rows.length) return rows;

    const created = unwrap(await supabase
        .from('calendars')
        .insert({
            owner_id: userId,
            name: 'Mi agenda',
            color: '#6025D2',
            is_default: true,
            visibility: 'private',
        })
        .select('*')
        .single());

    return [created as Json];
}

function overlaps(event: Json, query: URLSearchParams): boolean {
    const start = query.get('range_start');
    const end = query.get('range_end');
    const eventStart = String(event.starts_at || event.starts_on || '');
    const eventEnd = String(event.ends_at || event.ends_on || eventStart);
    if (start && eventEnd && eventEnd < start) return false;
    if (end && eventStart && eventStart > end) return false;
    return true;
}

export async function handleCalendar(
    method: string,
    path: string,
    body: unknown,
    query: URLSearchParams,
): Promise<unknown> {
    const { supabase, userId } = await requireClient();
    const payload = asJson(body);
    const calendars = await ensureDefaultCalendar(supabase, userId);
    const calendarIds = calendars.map((item) => String(item.id));

    if (method === 'GET' && path === '/calendar/bootstrap/') {
        const settings = await readSettings(supabase, userId);
        const profile = unwrap(await supabase
            .from('profiles')
            .select('timezone, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle());
        const preferences = {
            ...defaultPreferences(
                userId,
                String(profile?.timezone || 'America/Bogota'),
                String(profile?.created_at || new Date().toISOString()),
            ),
            ...asJson(settings.calendar),
        };
        const events = calendarIds.length
            ? ((unwrap(await supabase
                .from('events')
                .select('*')
                .in('calendar_id', calendarIds)
                .order('starts_at', { ascending: true })
                .limit(Number(query.get('limit') || 200))) ?? []) as Json[])
                .filter((event) => overlaps(event, query))
                .map((event) => mapEvent(event, userId))
            : [];
        const tags: Json[] = [];
        const seen = new Set<string>();
        for (const event of events) {
            for (const tag of asRows<Json>(event.tags)) {
                const name = String(tag.name || tag.id || '');
                if (!name || seen.has(name)) continue;
                seen.add(name);
                tags.push({ id: name, name, owner_id: userId });
            }
        }

        return {
            preferences,
            calendars: calendars.map(mapCalendar),
            tags,
            events,
            count: events.length,
            range_start: query.get('range_start'),
            range_end: query.get('range_end'),
        };
    }

    if (method === 'GET' && path === '/calendar/calendars/') {
        return { calendars: calendars.map(mapCalendar) };
    }

    if (method === 'POST' && path === '/calendar/calendars/') {
        const calendar = mapCalendar(unwrap(await supabase
            .from('calendars')
            .insert({
                owner_id: userId,
                name: String(payload.name || 'Agenda'),
                description: payload.description ?? null,
                color: payload.color || '#6025D2',
                timezone: payload.timezone || 'America/Bogota',
                is_default: false,
            })
            .select('*')
            .single()) as Json);
        return { calendar };
    }

    if (method === 'GET' && path === '/calendar/events/') {
        const events = calendarIds.length
            ? ((unwrap(await supabase
                .from('events')
                .select('*')
                .in('calendar_id', calendarIds)
                .order('starts_at', { ascending: true })
                .limit(Number(query.get('limit') || 200))) ?? []) as Json[])
                .filter((event) => overlaps(event, query))
                .filter((event) => (
                    query.get('search')
                        ? String(event.title || '').toLowerCase().includes(
                            String(query.get('search')).toLowerCase(),
                        )
                        : true
                ))
                .map((event) => mapEvent(event, userId))
            : [];
        return { events, count: events.length };
    }

    if (method === 'POST' && path === '/calendar/events/') {
        const event = mapEvent(unwrap(await supabase
            .from('events')
            .insert({
                organizer_id: userId,
                status: 'confirmed',
                kind: payload.event_kind || 'in_person',
                title: payload.title,
                ...eventWrite(payload, userId),
            })
            .select('*')
            .single()) as Json, userId);
        return { event };
    }

    if (method === 'GET' && path === '/calendar/users/search/') {
        const users = await searchProfiles(
            supabase,
            query.get('q') || '',
            Number(query.get('limit') || 20),
        );
        return { users };
    }

    if (method === 'GET' && path === '/calendar/conflicts/') {
        const events = calendarIds.length
            ? ((unwrap(await supabase
                .from('events')
                .select('id, calendar_id, title, kind, starts_at, ends_at, starts_on, ends_on, is_all_day')
                .in('calendar_id', calendarIds)) ?? []) as Json[])
            : [];
        const conflicts = events
            .filter((event) => String(event.id) !== (query.get('exclude_event_id') || ''))
            .filter((event) => overlaps(event, query))
            .map((event) => {
                const calendar = calendars.find((item) => item.id === event.calendar_id);
                return {
                    event_id: event.id,
                    calendar_id: event.calendar_id,
                    calendar_name: calendar?.name || 'Agenda',
                    calendar_color: calendar?.color || '#6025D2',
                    source: 'beeapp',
                    event_kind: event.kind,
                    is_all_day: event.is_all_day === true,
                    starts_at: event.starts_at ?? null,
                    ends_at: event.ends_at ?? null,
                    starts_on: event.starts_on ?? null,
                    ends_on: event.ends_on ?? null,
                    details_hidden: false,
                };
            });
        return { conflicts };
    }

    if (method === 'GET' && path === '/calendar/integrations/') {
        const { handleCalendarIntegrations } = await import('./mail');
        return handleCalendarIntegrations(supabase, userId);
    }

    const integration = path.match(new RegExp(`^/calendar/integrations/(${UUID})/$`, 'i'));
    if (integration && method === 'GET') {
        const { integrationById } = await import('./mail');
        return { integration: await integrationById(supabase, userId, integration[1], 'calendar') };
    }

    const externalList = path.match(
        new RegExp(`^/calendar/integrations/(${UUID})/external-calendars/$`, 'i'),
    );
    if (externalList && method === 'GET') {
        const rows = (unwrap(await supabase
            .from('calendars')
            .select('*')
            .eq('owner_id', userId)
            .eq('integration_id', externalList[1])) ?? []) as Json[];
        return { external_calendars: rows.map(mapExternal) };
    }

    const discover = path.match(
        new RegExp(`^/calendar/integrations/(${UUID})/discover-calendars/$`, 'i'),
    );
    if (discover && method === 'POST') {
        return invokeCalendarSync(supabase, discover[1], 'discover');
    }

    const sync = path.match(new RegExp(`^/calendar/integrations/(${UUID})/sync/$`, 'i'));
    if (sync && method === 'POST') {
        return invokeCalendarSync(supabase, sync[1], 'sync');
    }

    const external = path.match(new RegExp(`^/calendar/external-calendars/(${UUID})/$`, 'i'));
    if (external && method === 'PATCH') {
        const current = unwrap(await supabase
            .from('calendars')
            .select('*')
            .eq('id', external[1])
            .eq('owner_id', userId)
            .single()) as Json;
        const shared = asJson(current.shared_with && !Array.isArray(current.shared_with)
            ? current.shared_with
            : {});
        if ('is_visible' in payload) shared.is_visible = payload.is_visible;
        if ('is_selected' in payload) shared.is_selected = payload.is_selected;
        const row = unwrap(await supabase
            .from('calendars')
            .update({
                is_archived: payload.is_visible === 'hidden',
                shared_with: shared,
            })
            .eq('id', external[1])
            .select('*')
            .single()) as Json;
        return { external_calendar: mapExternal(row) };
    }

    const duplicate = path.match(new RegExp(`^/calendar/events/(${UUID})/duplicate/$`, 'i'));
    if (duplicate && method === 'POST') {
        const source = unwrap(await supabase
            .from('events')
            .select('*')
            .eq('id', duplicate[1])
            .single()) as Json;
        const copy = { ...source };
        delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        if (payload.calendar_id) copy.calendar_id = payload.calendar_id;
        if ('starts_at' in payload) copy.starts_at = payload.starts_at;
        if ('ends_at' in payload) copy.ends_at = payload.ends_at;
        if ('starts_on' in payload) copy.starts_on = payload.starts_on;
        if ('ends_on' in payload) copy.ends_on = payload.ends_on;
        if (payload.include_attendees === false) copy.attendees = [];
        if (payload.include_reminders === false) copy.reminders = [];
        if (payload.include_recurrence === false) copy.recurrence = null;
        copy.organizer_id = userId;
        copy.title = `${source.title || 'Evento'} (copia)`;
        const event = mapEvent(unwrap(await supabase
            .from('events')
            .insert(copy)
            .select('*')
            .single()) as Json, userId);
        return { event };
    }

    const rsvp = path.match(new RegExp(`^/calendar/events/(${UUID})/rsvp/$`, 'i'));
    if (rsvp && method === 'POST') {
        const source = unwrap(await supabase
            .from('events')
            .select('*')
            .eq('id', rsvp[1])
            .single()) as Json;
        const attendees = asRows<Json>(source.attendees);
        const next = attendees.map((item) => (
            item.attendee_user_id === userId
                ? {
                    ...item,
                    response_status: payload.response_status,
                    responded_at: new Date().toISOString(),
                }
                : item
        ));
        const event = mapEvent(unwrap(await supabase
            .from('events')
            .update({ attendees: next })
            .eq('id', rsvp[1])
            .select('*')
            .single()) as Json, userId);
        return { event };
    }

    const eventMatch = path.match(new RegExp(`^/calendar/events/(${UUID})/$`, 'i'));

    if (eventMatch && method === 'GET') {
        const event = mapEvent(unwrap(await supabase
            .from('events')
            .select('*')
            .eq('id', eventMatch[1])
            .single()) as Json, userId);
        return { event };
    }

    if (eventMatch && method === 'PATCH') {
        const current = unwrap(await supabase
            .from('events')
            .select('metadata')
            .eq('id', eventMatch[1])
            .single()) as Json;
        const write = eventWrite(payload, userId);
        if (write.metadata) {
            write.metadata = { ...asJson(current.metadata), ...asJson(write.metadata) };
        }
        const event = mapEvent(unwrap(await supabase
            .from('events')
            .update(write)
            .eq('id', eventMatch[1])
            .select('*')
            .single()) as Json, userId);
        return { event };
    }

    if (eventMatch && method === 'DELETE') {
        unwrap(await supabase
            .from('events')
            .delete()
            .eq('id', eventMatch[1]));
        return undefined;
    }

    throw new GatewayError(
        `Ruta de agenda aún no disponible en Supabase: ${path}`,
        501,
    );
}

function mapExternal(row: Json): Json {
    const prefs = asJson(row.shared_with && !Array.isArray(row.shared_with)
        ? row.shared_with
        : {});

    return {
        id: row.id,
        integration_id: row.integration_id,
        provider_calendar_id: row.external_id,
        name: row.name,
        description: row.description ?? null,
        timezone: row.timezone ?? null,
        provider_color: row.color ?? null,
        display_color: row.color ?? null,
        access_level: 'read',
        is_primary: row.is_default === true,
        is_selected: prefs.is_selected !== false,
        is_visible: row.is_archived ? 'hidden' : (prefs.is_visible || 'visible'),
        sync_cursor: null,
        last_successful_sync_at: null,
        last_attempted_sync_at: null,
        metadata: {},
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function invokeCalendarSync(
    supabase: Awaited<ReturnType<typeof requireClient>>['supabase'],
    integrationId: string,
    action: 'discover' | 'sync',
): Promise<Json> {
    const row = unwrap(await supabase
        .from('integrations')
        .select('id, provider, status')
        .eq('id', integrationId)
        .single()) as Json;
    const invoked = await supabase.functions.invoke('calendar-sync', {
        body: { action, integration_id: integrationId },
    });
    const data = asJson(invoked.data);
    const rows = (unwrap(await supabase
        .from('calendars')
        .select('*')
        .eq('integration_id', integrationId)) ?? []) as Json[];

    if (action === 'discover') {
        return {
            integration_id: integrationId,
            provider: row.provider,
            account_color: '#6025D2',
            discovered_count: Number(data.discovered_count || rows.length),
            external_calendars: rows.map(mapExternal),
            message: data.message || invoked.error?.message || null,
        };
    }

    const { integrationById } = await import('./mail');
    return {
        integration_id: integrationId,
        provider: row.provider,
        synced_external_calendar_count: Number(data.synced_external_calendar_count || 0),
        fetched_event_count: Number(data.fetched_event_count || 0),
        created_event_count: Number(data.created_event_count || 0),
        updated_event_count: Number(data.updated_event_count || 0),
        skipped_event_count: Number(data.skipped_event_count || 0),
        synced_events_count: Number(data.synced_events_count || 0),
        integration: await integrationById(
            supabase,
            String((await supabase.auth.getUser()).data.user?.id || ''),
            integrationId,
            'calendar',
        ),
        message: data.message || null,
    };
}
