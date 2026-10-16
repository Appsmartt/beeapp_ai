export type SearchRecord = Record<string, unknown>;

const SEARCH_STOP_WORDS = new Set([
    'a',
    'al',
    'busco',
    'buscar',
    'con',
    'de',
    'del',
    'el',
    'en',
    'hoy',
    'la',
    'las',
    'lo',
    'los',
    'me',
    'mi',
    'necesita',
    'necesito',
    'o',
    'para',
    'por',
    'que',
    'quieres',
    'quiero',
    'se',
    'su',
    'te',
    'tu',
    'un',
    'una',
    'unas',
    'unos',
    'y',
]);

export function foldSearchText(value: unknown): string {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

export function marketplaceSearchTerms(raw: string): string[] {
    const folded = foldSearchText(raw).trim();
    if (folded.length < 2) return [];

    const words = folded
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length >= 2 && !SEARCH_STOP_WORDS.has(word));

    return Array.from(new Set(words));
}

export function marketplaceMatchScore(
    blob: string,
    terms: string[],
): number {
    if (terms.length === 0) return 0;

    return terms.reduce((score, term) => (
        blob.includes(term) ? score + 1 : score
    ), 0);
}

function categoryNamesOf(
    row: SearchRecord,
    categoryNames: Map<string, string>,
): string {
    const ids = [
        row.category_id,
        ...(Array.isArray(row.category_ids) ? row.category_ids : []),
    ];

    return ids
        .map((id) => categoryNames.get(String(id)) || '')
        .filter(Boolean)
        .join(' ');
}

function offerTypeWords(value: unknown): string {
    const offerType = String(value || '');
    if (offerType === 'services') return 'servicios servicio';
    if (offerType === 'products') return 'productos producto';
    return offerType;
}

export function businessSearchBlob(
    row: SearchRecord,
    categoryNames: Map<string, string>,
): string {
    return [
        row.display_name,
        row.description,
        row.custom_activity_text,
        row.city,
        offerTypeWords(row.offer_type),
        categoryNamesOf(row, categoryNames),
    ].map(foldSearchText).join(' ');
}

export function offerSearchBlob(
    row: SearchRecord,
    categoryNames: Map<string, string>,
): string {
    const business = (
        row.businesses
        && typeof row.businesses === 'object'
        && !Array.isArray(row.businesses)
    )
        ? row.businesses as SearchRecord
        : {};

    return [
        businessSearchBlob(business, categoryNames),
        foldSearchText(row.title),
        foldSearchText(row.description),
    ].join(' ');
}
