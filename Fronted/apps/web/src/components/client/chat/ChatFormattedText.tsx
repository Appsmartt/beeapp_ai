'use client';

import type { ReactNode } from 'react';

const INLINE_TOKEN_PATTERN =
  /(\*\*[^\n]+?\*\*|\*[^\s*\n](?:[^*\n]*[^\s*\n])?\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

interface InlineTextProps {
  text: string;
  inverted?: boolean;
}

/**
 * Renderiza formato inline ligero (negrita **, cursiva *, código ` y enlaces)
 * sin inyectar HTML crudo.
 */
export function ChatInlineText({ text, inverted = false }: InlineTextProps) {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  INLINE_TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_TOKEN_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      nodes.push(
        <strong key={keyIndex++} className="font-bold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      nodes.push(
        <em key={keyIndex++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      nodes.push(
        <code
          key={keyIndex++}
          className={`rounded px-1 py-0.5 font-mono text-[0.9em] ${
            inverted ? 'bg-white/15 text-white' : 'bg-black/5 text-neutral-900'
          }`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={keyIndex++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
}

interface ChatFormattedTextProps {
  text: string;
  inverted?: boolean;
  className?: string;
}

/**
 * Renderiza mensajes de chat y del asistente respetando saltos de línea,
 * viñetas simples (- / *) y formato inline (**negrita**, *cursiva*, `código`).
 */
export default function ChatFormattedText({
  text,
  inverted = false,
  className = '',
}: ChatFormattedTextProps) {
  if (!text) return null;

  const lines = text.split(/\r?\n/);

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {lines.map((line, index) => {
        if (!line.trim()) {
          return <div key={index} className="h-1.5" aria-hidden="true" />;
        }

        const headingMatch = /^#{1,3}\s+(.*)$/.exec(line);
        if (headingMatch) {
          return (
            <p key={index} className="whitespace-pre-wrap break-words font-bold">
              <ChatInlineText text={headingMatch[1]} inverted={inverted} />
            </p>
          );
        }

        const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-1.5 pl-1">
              <span aria-hidden="true" className="select-none">
                •
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                <ChatInlineText text={bulletMatch[1]} inverted={inverted} />
              </span>
            </div>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap break-words">
            <ChatInlineText text={line} inverted={inverted} />
          </p>
        );
      })}
    </div>
  );
}
