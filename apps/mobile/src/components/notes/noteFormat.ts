/**
 * Formato de notas con marcadores tipo markdown. No hay editor WYSIWYG:
 * los botones insertan marcadores en el texto y `NoteMarkdownText` los pinta.
 */

export interface TextSelection {
  start: number;
  end: number;
}

export interface FormatResult {
  text: string;
  selection: TextSelection;
}

export const wordCount = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

/** Inicio y fin de la línea donde está el cursor */
const lineRange = (text: string, at: number) => {
  const start = text.lastIndexOf('\n', Math.max(0, at - 1)) + 1;
  const breakAt = text.indexOf('\n', at);
  return { start, end: breakAt === -1 ? text.length : breakAt };
};

/** Envuelve lo seleccionado con el marcador, o lo quita si ya lo tiene */
export const wrapSelection = (
  text: string,
  selection: TextSelection,
  marker: string
): FormatResult => {
  const { start, end } = selection;
  const selected = text.slice(start, end) || 'texto';
  const already =
    selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2;

  const next = already ? selected.slice(marker.length, -marker.length) : `${marker}${selected}${marker}`;
  const offset = already ? -marker.length : marker.length;

  return {
    text: text.slice(0, start) + next + text.slice(end),
    selection: { start: start + offset, end: start + offset + (already ? next.length : selected.length) },
  };
};

/** Pone o quita un prefijo a la línea actual (viñetas, numeradas, títulos) */
export const toggleLinePrefix = (
  text: string,
  selection: TextSelection,
  prefix: string
): FormatResult => {
  const { start, end } = lineRange(text, selection.start);
  const line = text.slice(start, end);

  if (line.startsWith(prefix)) {
    const stripped = line.slice(prefix.length);
    return {
      text: text.slice(0, start) + stripped + text.slice(end),
      selection: { start: start + stripped.length, end: start + stripped.length },
    };
  }

  // Se limpia cualquier otro marcador de línea antes de poner el nuevo
  const clean = line.replace(/^(#{1,2} |- |\d+\. )/, '');
  const next = prefix + clean;
  return {
    text: text.slice(0, start) + next + text.slice(end),
    selection: { start: start + next.length, end: start + next.length },
  };
};

/** El número que le toca a la línea, mirando la anterior */
export const nextListNumber = (text: string, at: number) => {
  const { start } = lineRange(text, at);
  if (start === 0) return 1;
  const previous = text.slice(text.lastIndexOf('\n', start - 2) + 1, start - 1);
  const match = /^(\d+)\. /.exec(previous);
  return match ? Number(match[1]) + 1 : 1;
};

/** Mete un fragmento donde esté el cursor */
export const insertAtCursor = (
  text: string,
  selection: TextSelection,
  snippet: string
): FormatResult => {
  const { start, end } = selection;
  return {
    text: text.slice(0, start) + snippet + text.slice(end),
    selection: { start: start + snippet.length, end: start + snippet.length },
  };
};
