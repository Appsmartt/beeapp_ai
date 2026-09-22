export const STATUS_DEFAULT_FONT_FAMILY = 'System';

export const STATUS_TEXT_COLORS = [
  '#263654',
  '#5B3F73',
  '#8C4567',
  '#2E5C73',
  '#3E6B58',
  '#925A3C',
  '#8A6A20',
  '#46556B',
  '#69549A',
  '#A34F4F',
  '#356B4A',
  '#3E4F8F',
  '#794961',
  '#735040',
  '#FFFDF8',
] as const;

export const STATUS_PASTEL_BACKGROUND_COLORS = [
  '#E9E1FF',
  '#F8DCEB',
  '#DDEEFF',
  '#DDF5EC',
  '#FFE2CC',
  '#FFF1B8',
  '#FFE0E7',
  '#EEF2F8',
  '#EAE6FA',
  '#FFDCD6',
  '#E2F1D8',
  '#E1E8FF',
  '#F1DFEE',
  '#F8E8D5',
  '#FFF7D6',
] as const;

export const STATUS_FONT_OPTIONS = [
  {
    id: 'playfair',
    label: 'Elegante',
    fontFamily: 'PlayfairDisplay_700Bold',
    preview: 'Hay días que cambian todo.',
  },
  {
    id: 'bebas',
    label: 'Cinemática',
    fontFamily: 'BebasNeue_400Regular',
    preview: 'HOY TODO CUENTA',
  },
  {
    id: 'caveat',
    label: 'Manuscrita',
    fontFamily: 'Caveat_600SemiBold',
    preview: 'Que nunca falten motivos.',
  },
  {
    id: 'anton',
    label: 'Bold moderna',
    fontFamily: 'Anton_400Regular',
    preview: 'HOY ELIJO ESTAR BIEN.',
  },
  {
    id: 'dmSerif',
    label: 'Editorial',
    fontFamily: 'DMSerifDisplay_400Regular',
    preview: 'Todo empieza cuando decides intentarlo.',
  },
  {
    id: 'nunito',
    label: 'Chat',
    fontFamily: 'NunitoSans_600SemiBold',
    preview: 'Hoy solo quiero buenas noticias.',
  },
  {
    id: 'manrope',
    label: 'Minimal',
    fontFamily: 'Manrope_600SemiBold',
    preview: 'Menos ruido, más intención.',
  },
  {
    id: 'righteous',
    label: 'Creativa',
    fontFamily: 'Righteous_400Regular',
    preview: 'Hazlo memorable.',
  },
  {
    id: 'quicksand',
    label: 'Suave',
    fontFamily: 'Quicksand_600SemiBold',
    preview: 'Respira, todo va a estar bien.',
  },
] as const;

export type StatusFontFamily = (
  typeof STATUS_FONT_OPTIONS
)[number]['fontFamily'];

export function normalizeStatusFontFamily(
  value: unknown,
): string {
  const normalizedValue = String(value || '').trim();

  return STATUS_FONT_OPTIONS.some(
    (font) => font.fontFamily === normalizedValue,
  )
    ? normalizedValue
    : STATUS_DEFAULT_FONT_FAMILY;
}
