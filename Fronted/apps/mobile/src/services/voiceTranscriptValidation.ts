/** Grabaciones más cortas suelen producir transcripciones basura. */
export const MIN_VOICE_RECORDING_MS = 900;

const WHISPER_HALLUCINATION_PATTERNS = [
  /amara\.org/i,
  /comunidad de amara/i,
  /subt[ií]tulos?\s+(realizados|hechos|por|creados)/i,
  /subtitles?\s+(by|realized|created|from)/i,
  /thanks for watching/i,
  /please subscribe/i,
  /^gracias por ver/i,
  /suscr[ií]bete al canal/i,
];

export function normalizeVoiceTranscript(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isWhisperHallucination(text: string): boolean {
  const normalized = normalizeVoiceTranscript(text);
  if (!normalized) {
    return true;
  }
  return WHISPER_HALLUCINATION_PATTERNS.some(
    (pattern) => pattern.test(normalized),
  );
}

export type VoiceTranscriptValidation =
  | { ok: true; text: string }
  | { ok: false; message: string };

export function validateVoiceTranscript(
  text: string,
  options: { minLength?: number } = {},
): VoiceTranscriptValidation {
  const minLength = options.minLength ?? 2;
  const normalized = normalizeVoiceTranscript(text);

  if (!normalized || normalized.length < minLength) {
    return {
      ok: false,
      message: 'No entendí lo que dijiste. Inténtalo de nuevo o escribe tu búsqueda.',
    };
  }

  if (isWhisperHallucination(normalized)) {
    return {
      ok: false,
      message: 'No detectamos una búsqueda clara. Habla cerca del micrófono en un lugar silencioso e inténtalo otra vez.',
    };
  }

  return { ok: true, text: normalized };
}

export function validateVoiceRecordingDuration(
  durationMs: number,
): VoiceTranscriptValidation {
  if (durationMs < MIN_VOICE_RECORDING_MS) {
    return {
      ok: false,
      message: 'La grabación fue muy corta. Mantén pulsado el micrófono mientras hablas.',
    };
  }
  return { ok: true, text: '' };
}
