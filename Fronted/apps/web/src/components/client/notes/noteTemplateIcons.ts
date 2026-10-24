import {
    BookOpen,
    BriefcaseBusiness,
    Calculator,
    CalendarDays,
    ChefHat,
    ClipboardList,
    FileText,
    GraduationCap,
    Heart,
    Home,
    Lightbulb,
    Plane,
    ReceiptText,
    ScrollText,
    Target,
    Users,
    UtensilsCrossed,
    WalletCards,
    type LucideIcon,
    } from 'lucide-react';

/*
 * El campo `icon` de note_templates se almacena en backend como una clave
 * estable de texto. Este mapa la convierte a un componente de lucide-react.
 *
 * Mantiene alias para valores antiguos o alternativos, de modo que agregar
 * templates desde Supabase no rompa la interfaz si usa claves similares.
 */
const NOTE_TEMPLATE_ICONS: Record<string, LucideIcon> = {
    /* Plantillas actuales */

    'clipboard-list': ClipboardList,
    'wallet-cards': WalletCards,
    'chef-hat': ChefHat,
    house: Home,
    heart: Heart,
    'book-open': BookOpen,
    lightbulb: Lightbulb,
    plane: Plane,
    users: Users,

    /* Alias para compatibilidad */

    project: ClipboardList,
    proyecto: ClipboardList,
    briefcase: BriefcaseBusiness,
    'briefcase-business': BriefcaseBusiness,
    target: Target,

    budget: WalletCards,
    presupuesto: WalletCards,
    calculator: Calculator,
    receipt: ReceiptText,
    'receipt-text': ReceiptText,

    recipe: ChefHat,
    receta: ChefHat,
    food: UtensilsCrossed,
    'utensils-crossed': UtensilsCrossed,

    home: Home,
    hogar: Home,

    personal: Heart,

    study: BookOpen,
    estudio: GraduationCap,
    'graduation-cap': GraduationCap,

    idea: Lightbulb,

    travel: Plane,
    viaje: Plane,

    meeting: Users,
    reunion: Users,
    reunión: Users,

    calendar: CalendarDays,
    'calendar-days': CalendarDays,

    document: FileText,
    documento: FileText,
    'file-text': FileText,
    'scroll-text': ScrollText,
    'layout-template': ScrollText,
};

function normalizeTemplateIconKey(value?: string | null): string {
    return (value || '')
        .trim()
        .toLocaleLowerCase()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-');
}

export function getNoteTemplateIcon(
    iconKey?: string | null,
    ): LucideIcon {
    const normalizedKey = normalizeTemplateIconKey(iconKey);

    return NOTE_TEMPLATE_ICONS[normalizedKey] || FileText;
}