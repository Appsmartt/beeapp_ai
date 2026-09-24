export const STATUS_DEFAULT_FONT_FAMILY = "System";

export const STATUS_TEXT_COLORS = [
  "#263654",
  "#5B3F73",
  "#8C4567",
  "#2E5C73",
  "#3E6B58",
  "#925A3C",
  "#8A6A20",
  "#46556B",
  "#69549A",
  "#A34F4F",
  "#356B4A",
  "#3E4F8F",
  "#794961",
  "#735040",
  "#FFFDF8",
] as const;

export const STATUS_PASTEL_BACKGROUND_COLORS = [
  "#E9E1FF",
  "#F8DCEB",
  "#DDEEFF",
  "#DDF5EC",
  "#FFE2CC",
  "#FFF1B8",
  "#FFE0E7",
  "#EEF2F8",
  "#EAE6FA",
  "#FFDCD6",
  "#E2F1D8",
  "#E1E8FF",
  "#F1DFEE",
  "#F8E8D5",
  "#FFF7D6",
] as const;

export const STATUS_FONT_OPTIONS = [
  {
    id: "playfair",
    label: "Elegante",
    fontFamily: "PlayfairDisplay_700Bold",
    preview: "Hay días que cambian todo.",
    sampleText: "Hay días\nque lo\ncambian\ntodo.",
    templateFontSize: 58,
  },
  {
    id: "bebas",
    label: "Cinemática",
    fontFamily: "BebasNeue_400Regular",
    preview: "HOY TODO CUENTA",
    sampleText: "HOY TODO\nCUENTA MÁS\nDE LO QUE\nIMAGINAS",
    templateFontSize: 62,
  },
  {
    id: "caveat",
    label: "Manuscrita",
    fontFamily: "Caveat_600SemiBold",
    preview: "Que nunca falten motivos.",
    sampleText: "Que nunca\nte falten\nmotivos para\nvolver a sonreír.",
    templateFontSize: 48,
  },
  {
    id: "anton",
    label: "Bold moderna",
    fontFamily: "Anton_400Regular",
    preview: "HOY ELIJO ESTAR BIEN.",
    sampleText: "HOY ELIJO\nESTAR BIEN\nAUNQUE NO\nTODO SEA FÁCIL.",
    templateFontSize: 54,
  },
  {
    id: "dmSerif",
    label: "Editorial",
    fontFamily: "DMSerifDisplay_400Regular",
    preview: "Todo empieza cuando decides intentarlo.",
    sampleText: "Todo empieza\ncuando decides\ncreer de nuevo\nen ti.",
    templateFontSize: 50,
  },
  {
    id: "nunito",
    label: "Chat",
    fontFamily: "NunitoSans_600SemiBold",
    preview: "Hoy solo quiero buenas noticias.",
    sampleText: "Hoy quiero\nbuenas noticias\ny gente que\nsume bonito.",
    templateFontSize: 48,
  },
  {
    id: "manrope",
    label: "Minimal",
    fontFamily: "Manrope_600SemiBold",
    preview: "Menos ruido, más intención.",
    sampleText: "Menos ruido.\nMás intención.\nMás calma.\nMás vida.",
    templateFontSize: 54,
  },
  {
    id: "righteous",
    label: "Creativa",
    fontFamily: "Righteous_400Regular",
    preview: "Hazlo memorable.",
    sampleText: "Hazlo\nmemorable,\nhazlo tuyo,\nhazlo ahora.",
    templateFontSize: 58,
  },
  {
    id: "quicksand",
    label: "Suave",
    fontFamily: "Quicksand_600SemiBold",
    preview: "Respira, todo puede volver a estar bien.",
    sampleText: "Respira, todo puede\nvolver a estar\nbien.",
    templateFontSize: 54,
  },
  {
    id: "oswald",
    label: "Impacto",
    fontFamily: "Oswald_700Bold",
    preview: "HOY ES TU MOMENTO.",
    sampleText: "HOY ES\nTU MOMENTO.\nNO LO\nDEJES PASAR.",
    templateFontSize: 64,
  },
  {
    id: "lora",
    label: "Esencia",
    fontFamily: "Lora_600SemiBold",
    preview: "Lo importante empieza dentro de ti.",
    sampleText: "Lo importante\nempieza dentro\nde ti, cuando\nte eliges.",
    templateFontSize: 50,
  },
] as const;

export type StatusFontFamily = (
  typeof STATUS_FONT_OPTIONS
)[number]["fontFamily"];

export function normalizeStatusFontFamily(
  value: unknown,
): string {
  const normalizedValue = String(value || "").trim();

  return STATUS_FONT_OPTIONS.some(
    (font) => font.fontFamily === normalizedValue,
  )
    ? normalizedValue
    : STATUS_DEFAULT_FONT_FAMILY;
}
