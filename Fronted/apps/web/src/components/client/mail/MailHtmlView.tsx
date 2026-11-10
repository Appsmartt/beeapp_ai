'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { downloadMailAttachment } from '@beeapp/api-client';
import type { MailMessageAttachment } from '@beeapp/shared-types';

import { getWebAuth } from '@/lib/client/webAuth';

const MAX_INLINE_BYTES = 8_000_000;
const EMPTY_IMAGES = new Map<string, string>();

interface MailHtmlViewProps {
  messageId: string;
  html: string;
  attachments: MailMessageAttachment[];
}

interface CleanMailHtml {
  body: string;
  css: string;
}

function cidKey(value: string): string {
  const withoutScheme = value
    .trim()
    .replace(/^cid:/i, '')
    .replace(/^<|>$/g, '');

  let decoded = withoutScheme;

  try {
    decoded = decodeURIComponent(withoutScheme);
  } catch {
    decoded = withoutScheme;
  }

  return decoded.trim().toLowerCase();
}

function cidKeys(value: string): string[] {
  const key = cidKey(value);

  if (!key) {
    return [];
  }

  const localPart = key.split('@')[0];

  return localPart && localPart !== key
    ? [key, localPart]
    : [key];
}

function sanitizeCss(css: string): string {
  return css
    .replace(/@import[\s\S]*?;/gi, '')
    .replace(/expression\s*\(/gi, 'blocked(')
    .replace(/javascript\s*:/gi, '')
    .replace(/-moz-binding\s*:[^;]*/gi, '')
    .replace(/behavior\s*:[^;]*/gi, '')
    .replace(
      /url\s*\(\s*(['"])?\s*data:(?!image\/)/gi,
      'url($1data:blocked,',
    );
}

function isSafeResource(value: string): boolean {
  return /^(https?:|cid:|\/\/)/i.test(value.trim());
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function stripDarkColorScheme(css: string): string {
  const marker = /@media[^{]*prefers-color-scheme\s*:\s*dark[^{]*\{/gi;
  let result = '';
  let lastIndex = 0;
  let match = marker.exec(css);

  while (match) {
    result += css.slice(lastIndex, match.index);

    let depth = 1;
    let index = marker.lastIndex;

    while (index < css.length && depth > 0) {
      const character = css[index];

      if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
      }

      index += 1;
    }

    lastIndex = index;
    marker.lastIndex = index;
    match = marker.exec(css);
  }

  result += css.slice(lastIndex);

  return result.replace(
    /color-scheme\s*:\s*[^;}!]*/gi,
    'color-scheme: light',
  );
}

function wrapOriginalBody(body: HTMLElement): string {
  const className = body.getAttribute('class') || '';
  const style = body.getAttribute('style') || '';
  const bgcolor = (body.getAttribute('bgcolor') || '').trim();
  const inner = body.innerHTML;

  if (!className && !style && !bgcolor) {
    return inner;
  }

  const classAttr = className
    ? ` class="${escapeHtmlAttr(className)}"`
    : '';
  const styleAttr = style
    ? ` style="${escapeHtmlAttr(style)}"`
    : '';
  const bgAttr = /^#?[0-9a-f]{3,8}$/i.test(bgcolor)
    ? ` bgcolor="${escapeHtmlAttr(bgcolor)}"`
    : '';

  return `<div${classAttr}${styleAttr}${bgAttr}>${inner}</div>`;
}

function sanitizeMailHtml(html: string): CleanMailHtml {
  const document = new DOMParser().parseFromString(
    html,
    'text/html',
  );

  document
    .querySelectorAll('script, iframe, object, embed, link, meta, base, form')
    .forEach((node) => node.remove());

  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        (
          name === 'href'
          || name === 'src'
          || name === 'poster'
          || name === 'action'
          || name === 'xlink:href'
        )
        && /^javascript:/i.test(value)
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        (name === 'src' || name === 'poster' || name === 'background')
        && value
        && !isSafeResource(value)
      ) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'style') {
        element.setAttribute(
          attribute.name,
          sanitizeCss(attribute.value),
        );
      }
    });
  });

  document.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  const css = stripDarkColorScheme(
    Array.from(document.querySelectorAll('style'))
      .map((style) => sanitizeCss(style.textContent || ''))
      .join('\n'),
  );

  document.querySelectorAll('style').forEach((style) => {
    style.remove();
  });

  return {
    body: wrapOriginalBody(document.body),
    css,
  };
}

function applyCidMap(
  html: string,
  images: Map<string, string>,
): string {
  if (images.size === 0) {
    return html;
  }

  return html.replace(
    /cid:([^"'()\s>]+)/gi,
    (match, raw: string) => {
      const replacement = cidKeys(raw)
        .map((key) => images.get(key))
        .find(Boolean);

      return replacement || match;
    },
  );
}

function buildMailDocument(
  body: string,
  css: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<base target="_blank">
<style>
  :root { color-scheme: light; }
  html, body {
    margin: 0;
    background: #ffffff;
    color: #1f2937;
    font: 14px/1.55 Arial, Helvetica, sans-serif;
    overflow-wrap: anywhere;
    scrollbar-width: thin;
    scrollbar-color: rgba(96, 37, 210, 0.55) transparent;
  }
  html::-webkit-scrollbar,
  body::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  html::-webkit-scrollbar-track,
  body::-webkit-scrollbar-track {
    background: transparent;
  }
  html::-webkit-scrollbar-thumb,
  body::-webkit-scrollbar-thumb {
    background-color: rgba(96, 37, 210, 0.45);
    border-radius: 9999px;
  }
  html::-webkit-scrollbar-thumb:hover,
  body::-webkit-scrollbar-thumb:hover {
    background-color: #6025d2;
  }
  img, video { max-width: 100%; height: auto; }
  a { color: #7427D5; }
  table { max-width: 100%; }
  ${css}
  :root, html { color-scheme: light !important; }
  html, body {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: hidden !important;
  }
  body { padding: 8px 0 16px !important; }
  img, video { max-width: 100% !important; height: auto !important; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function imageMimeType(
  file: MailMessageAttachment,
  blob: Blob,
): string | null {
  if (file.mime_type?.startsWith('image/')) {
    return file.mime_type;
  }

  if (blob.type.startsWith('image/')) {
    return blob.type;
  }

  const filename = file.filename.toLowerCase();

  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (filename.endsWith('.gif')) return 'image/gif';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.svg')) return 'image/svg+xml';

  return null;
}

function blobToDataUrl(
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const source = blob.type === mimeType
    ? blob
    : new Blob([blob], { type: mimeType });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(String(reader.result || ''));
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsDataURL(source);
  });
}

function referencedAttachments(
  html: string,
  attachments: MailMessageAttachment[],
): MailMessageAttachment[] {
  const referenced = new Set<string>();

  html.replace(/cid:([^"'()\s>]+)/gi, (_match, raw: string) => {
    cidKeys(raw).forEach((key) => referenced.add(key));
    return '';
  });

  return attachments.filter((file) => {
    const keys = [
      ...cidKeys(file.content_id || ''),
      ...cidKeys(file.id),
      ...cidKeys(file.filename),
    ];

    return keys.some((key) => referenced.has(key));
  });
}

export default function MailHtmlView({
  messageId,
  html,
  attachments,
}: MailHtmlViewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const clean = useMemo(
    () => sanitizeMailHtml(html),
    [html],
  );
  const [storedImages, setStoredImages] = useState<{
    messageId: string;
    images: Map<string, string>;
  }>({
    messageId: '',
    images: new Map(),
  });
  const images = storedImages.messageId === messageId
    ? storedImages.images
    : EMPTY_IMAGES;

  const srcDoc = useMemo(
    () => buildMailDocument(
      applyCidMap(clean.body, images),
      clean.css,
    ),
    [clean, images],
  );

  useEffect(() => {
    let cancelled = false;

    const targets = referencedAttachments(html, attachments)
      .filter((file) => (
        !file.size_bytes || file.size_bytes <= MAX_INLINE_BYTES
      ));

    if (targets.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const auth = await getWebAuth();
        const nextImages = new Map<string, string>();

        await Promise.all(targets.map(async (file) => {
          try {
            const result = await downloadMailAttachment(
              auth,
              messageId,
              file.id,
            );

            if (
              cancelled
              || result.blob.size > MAX_INLINE_BYTES
            ) {
              return;
            }

            const mimeType = imageMimeType(file, result.blob);

            if (!mimeType) {
              return;
            }

            const dataUrl = await blobToDataUrl(
              result.blob,
              mimeType,
            );

            [
              ...cidKeys(file.content_id || ''),
              ...cidKeys(file.id),
              ...cidKeys(file.filename),
            ].forEach((key) => {
              nextImages.set(key, dataUrl);
            });
          } catch {
            // Si una imagen no se puede leer, el resto del correo sigue visible.
          }
        }));

        if (!cancelled && nextImages.size > 0) {
          setStoredImages({
            messageId,
            images: nextImages,
          });
        }
      } catch {
        // El HTML remoto sigue visible aunque fallen las imágenes embebidas.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    attachments,
    html,
    messageId,
  ]);

  useEffect(() => () => {
    observerRef.current?.disconnect();
  }, []);

  const fitFrame = () => {
    const frame = frameRef.current;
    const frameDocument = frame?.contentDocument;
    const body = frameDocument?.body;

    if (!frame || !body || !frameDocument) {
      return;
    }

    const nextHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      frameDocument.documentElement.scrollHeight,
    );

    if (Math.abs(frame.offsetHeight - nextHeight) > 1) {
      frame.style.height = `${nextHeight}px`;
    }
  };

  return (
    <iframe
      ref={frameRef}
      title="Contenido del correo"
      scrolling="no"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={srcDoc}
      onLoad={() => {
        observerRef.current?.disconnect();
        fitFrame();

        const body = frameRef.current?.contentDocument?.body;

        if (!body) {
          return;
        }

        const observer = new ResizeObserver(() => {
          fitFrame();
        });

        observer.observe(body);
        observerRef.current = observer;
      }}
      className="block w-full border-0 bg-white"
    />
  );
}
