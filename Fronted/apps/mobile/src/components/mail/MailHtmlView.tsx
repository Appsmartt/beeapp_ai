import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import {
  Image,
  Linking,
  NativeModules,
  Pressable,
  StyleSheet,
  TurboModuleRegistry,
  View,
} from 'react-native';
import RenderHTML, {
  HTMLContentModel,
  HTMLElementModel,
  useContentWidth,
  type CustomRendererProps,
} from 'react-native-render-html';
import type { TBlock } from '@native-html/transient-render-engine';
import { colors } from '@beeapp/design-system';

const CUSTOM_MODELS = {
  center: HTMLElementModel.fromCustomModel({
    tagName: 'center',
    mixedUAStyles: {
      textAlign: 'center',
    },
    contentModel: HTMLContentModel.block,
  }),
  font: HTMLElementModel.fromCustomModel({
    tagName: 'font',
    contentModel: HTMLContentModel.mixed,
  }),
};

declare function require(moduleName: string): {
  WebView: ComponentType<Record<string, unknown>>;
};

function hasNativeWebView(): boolean {
  try {
    return Boolean(
      TurboModuleRegistry.get('RNCWebView')
      || NativeModules.RNCWebView
    );
  } catch {
    return false;
  }
}

const NATIVE_WEBVIEW = hasNativeWebView();

const SAFE_INLINE_CSS_PROPS = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-color',
  'border-left',
  'border-radius',
  'border-right',
  'border-style',
  'border-top',
  'border-width',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'height',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'opacity',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'text-transform',
  'vertical-align',
  'width',
]);

interface CssRuleBuckets {
  byTag: Map<string, string>;
  byClass: Map<string, string>;
  byId: Map<string, string>;
}

function stripImportant(css: string): string {
  return css.replace(/\s*!\s*important\b/gi, '');
}

function filterSafeDeclarations(rawDeclarations: string): string {
  const parts = stripImportant(rawDeclarations)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const kept: string[] = [];

  for (const part of parts) {
    const colonIndex = part.indexOf(':');

    if (colonIndex <= 0) {
      continue;
    }

    const prop = part.slice(0, colonIndex).trim().toLowerCase();
    const val = part.slice(colonIndex + 1).trim();

    if (!val || !SAFE_INLINE_CSS_PROPS.has(prop)) {
      continue;
    }

    if (prop === 'background' && /url\s*\(/i.test(val)) {
      continue;
    }

    kept.push(`${prop}: ${val}`);
  }

  return kept.join('; ');
}

function extractCssRulesFromStyleBlocks(html: string): CssRuleBuckets {
  const byTag = new Map<string, string>();
  const byClass = new Map<string, string>();
  const byId = new Map<string, string>();

  const styleMatches = Array.from(
    html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
  );

  for (const match of styleMatches) {
    const rawCss = (match[1] || '')
      .replace(/<!--/g, '')
      .replace(/-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@media\b[^{]*\{(?:[^{}]*\{[^{}]*\})*[^}]*\}/gi, '')
      .replace(/@(?:import|font-face|keyframes|supports)\b[^{;]*(?:\{(?:[^{}]*\{[^{}]*\})*[^}]*\}|;)/gi, '');

    const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
    let ruleMatch = rulePattern.exec(rawCss);

    while (ruleMatch) {
      const selectorsRaw = ruleMatch[1].trim();
      const declarations = filterSafeDeclarations(ruleMatch[2]);

      if (declarations) {
        const selectors = selectorsRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        for (const selector of selectors) {
          if (/^#[a-zA-Z0-9_-]+$/.test(selector)) {
            const idName = selector.slice(1).toLowerCase();
            const prev = byId.get(idName);
            byId.set(idName, prev ? `${prev}; ${declarations}` : declarations);
          } else if (/^\.[a-zA-Z0-9_-]+$/.test(selector)) {
            const className = selector.slice(1).toLowerCase();
            const prev = byClass.get(className);
            byClass.set(
              className,
              prev ? `${prev}; ${declarations}` : declarations,
            );
          } else if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(selector)) {
            const tagName = selector.toLowerCase();
            const prev = byTag.get(tagName);
            byTag.set(tagName, prev ? `${prev}; ${declarations}` : declarations);
          }
        }
      }

      ruleMatch = rulePattern.exec(rawCss);
    }
  }

  return { byTag, byClass, byId };
}

export function cleanLeakedCssText(text: string): string {
  if (!text || (!text.includes('{') && !text.includes('}'))) {
    return text;
  }

  return text
    .replace(
      /^\s*(?:[a-z-]+\s*:\s*[^;{}]+;\s*)*(?:!?\s*important\s*;?\s*)?\}+/i,
      ' ',
    )
    .replace(/@media\b[^{]*\{(?:[^{}]*\{[^{}]*\})*[^}]*\}/gi, ' ')
    .replace(
      /(?:^|[\s;}])(?:[.#]?[a-zA-Z0-9_-]+(?:\s+[.#a-zA-Z0-9_[\]="'-:*>+~]+)*)\s*\{[^{}]*\}/g,
      ' ',
    )
    .replace(/\s*\}+(?=\s|$)/g, ' ');
}

function getHtmlAttr(attrs: string, name: string): string {
  const quoted = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + '`' + `]+))`,
    'i',
  ).exec(attrs);

  return (quoted?.[1] ?? quoted?.[2] ?? quoted?.[3] ?? '').trim();
}

function normalizeCssLength(raw: string): string {
  const value = raw.trim();

  if (!value) {
    return '';
  }

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return `${value}px`;
  }

  if (/^\d+(?:\.\d+)?(?:px|%|em|rem|pt|vw|vh)$/i.test(value)) {
    return value.toLowerCase();
  }

  return '';
}

function enhanceTagAttributesForRenderHtml(
  tagNameRaw: string,
  attrsRaw: string,
  rules: CssRuleBuckets,
): string {
  const tagName = tagNameRaw.toLowerCase();
  const baseStyles: string[] = [];

  const tagRule = rules.byTag.get(tagName);
  if (tagRule) {
    baseStyles.push(tagRule);
  }

  const classAttr = getHtmlAttr(attrsRaw, 'class');
  if (classAttr) {
    const classNames = classAttr.split(/\s+/).filter(Boolean);
    for (const cls of classNames) {
      const classRule = rules.byClass.get(cls.toLowerCase());
      if (classRule) {
        baseStyles.push(classRule);
      }
    }
  }

  const idAttr = getHtmlAttr(attrsRaw, 'id');
  if (idAttr) {
    const idRule = rules.byId.get(idAttr.toLowerCase());
    if (idRule) {
      baseStyles.push(idRule);
    }
  }

  const bgColor = getHtmlAttr(attrsRaw, 'bgcolor');
  if (bgColor && /^(#[0-9a-f]{3,8}|[a-z]+|rgb\([^)]+\))$/i.test(bgColor)) {
    baseStyles.push(`background-color: ${bgColor}`);
  }

  const colorAttr = getHtmlAttr(attrsRaw, 'color');
  if (colorAttr && /^(#[0-9a-f]{3,8}|[a-z]+|rgb\([^)]+\))$/i.test(colorAttr)) {
    baseStyles.push(`color: ${colorAttr}`);
  }

  const alignAttr = getHtmlAttr(attrsRaw, 'align').toLowerCase();
  if (alignAttr === 'center' || alignAttr === 'left' || alignAttr === 'right') {
    if (tagName !== 'table' && tagName !== 'img') {
      baseStyles.push(`text-align: ${alignAttr}`);
    }
  }

  if (
    tagName === 'table'
    || tagName === 'td'
    || tagName === 'th'
    || tagName === 'div'
  ) {
    const widthAttr = normalizeCssLength(getHtmlAttr(attrsRaw, 'width'));
    if (widthAttr && tagName !== 'td' && tagName !== 'th') {
      baseStyles.push(`width: ${widthAttr}`);
    }
  }

  const existingStyleRaw = getHtmlAttr(attrsRaw, 'style');
  const cleanedExistingStyle = stripImportant(existingStyleRaw)
    .replace(/;\s*$/, '')
    .trim();

  if (!baseStyles.length && existingStyleRaw === cleanedExistingStyle) {
    return attrsRaw;
  }

  const mergedStyle = [
    ...baseStyles,
    cleanedExistingStyle,
  ]
    .filter(Boolean)
    .join('; ');

  const withoutStyle = attrsRaw.replace(
    /\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi,
    '',
  );

  const safeStyleAttr = mergedStyle.replace(/"/g, "'");
  return `${withoutStyle} style="${safeStyleAttr}"`;
}

export function prepareMailHtmlForScaledRender(rawHtml: string): string {
  const withoutScripts = rawHtml.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );
  const rules = extractCssRulesFromStyleBlocks(withoutScripts);

  const withoutStyleAndHead = withoutScripts
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/(?:^|>)[^<]*<\/style>/gi, (match) => (
      match.startsWith('>') ? '>' : ''
    ))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--[^>]*>/g, '');

  const withoutLeakedCss = withoutStyleAndHead.replace(
    />([^<]+)</g,
    (_full, textContent: string) => `>${cleanLeakedCssText(textContent)}<`,
  );

  return withoutLeakedCss.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g,
    (_full, tagName: string, attrs: string, selfClose: string) => {
      const enhancedAttrs = enhanceTagAttributesForRenderHtml(
        tagName,
        attrs,
        rules,
      );
      return `<${tagName}${enhancedAttrs}${selfClose}>`;
    },
  );
}

function detectMailLayoutWidth(html: string): number {
  const widths: number[] = [];
  const tableTagPattern = /<(?:table|td|div|center)\b[^>]*>/gi;
  let tagMatch = tableTagPattern.exec(html);

  while (tagMatch) {
    const tag = tagMatch[0];
    const widthPattern = /(?:width\s*=\s*["']?|(?:^|[\s;"'])width\s*:\s*|max-width\s*:\s*)(\d{3,4})(?:px|["'\s;>])/gi;
    let widthMatch = widthPattern.exec(tag);

    while (widthMatch) {
      const value = Number(widthMatch[1]);

      if (value >= 480 && value <= 760) {
        widths.push(value);
      }

      widthMatch = widthPattern.exec(tag);
    }

    tagMatch = tableTagPattern.exec(html);
  }

  if (widths.length) {
    return Math.max(...widths);
  }

  return /<table\b/i.test(html) ? 600 : 0;
}

function extractStylesForWebView(html: string): string {
  return Array.from(
    html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
  )
    .map((match) => {
      const css = (match[1] || '')
        .replace(/<!--/g, '')
        .replace(/-->/g, '');
      return `<style>${css}</style>`;
    })
    .join('');
}

function extractBodyForWebView(html: string): string {
  const withoutScriptsAndStyles = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/(?:^|>)[^<]*<\/style>/gi, (match) => (
      match.startsWith('>') ? '>' : ''
    ))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--[^>]*>/g, '');

  const match = withoutScriptsAndStyles.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const rawBody = match
    ? match[1]
    : withoutScriptsAndStyles
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');

  return rawBody.replace(
    />([^<]+)</g,
    (_full, textContent: string) => `>${cleanLeakedCssText(textContent)}<`,
  );
}

const FIT_SCRIPT = `
(function () {
  function report() {
    var root = document.getElementById('mail-root');
    if (!root || !window.ReactNativeWebView) return;
    var viewport = document.documentElement.clientWidth || window.innerWidth;
    if (!viewport) return;
    root.style.transform = 'none';
    root.style.width = viewport + 'px';
    var content = Math.max(root.scrollWidth, root.offsetWidth, viewport);
    var scale = content > viewport + 4 ? viewport / content : 1;
    root.style.width = content + 'px';
    root.style.transformOrigin = '0 0';
    root.style.transform = scale < 0.999 ? 'scale(' + scale + ')' : 'none';
    var rect = root.getBoundingClientRect();
    window.ReactNativeWebView.postMessage(JSON.stringify({
      height: Math.ceil(rect.height) + 16
    }));
  }
  window.addEventListener('load', function () { setTimeout(report, 30); });
  Array.prototype.forEach.call(document.images || [], function (img) {
    if (!img.complete) img.addEventListener('load', report);
  });
  setTimeout(report, 60);
  setTimeout(report, 350);
  setTimeout(report, 1000);
})();
`;

function buildMailDocument(html: string): string {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8" />'
    + '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />'
    + extractStylesForWebView(html)
    + '<style>html,body{margin:0;padding:0;background:#fff;overflow-x:hidden;}'
    + '#mail-root{transform-origin:0 0;box-sizing:border-box;}'
    + 'img{border:0;height:auto!important;max-width:100%!important;object-fit:contain;}'
    + 'td[align=center] img,th[align=center] img,center img{display:block;margin-left:auto;margin-right:auto;}'
    + 'table{border-collapse:collapse;}'
    + '</style></head><body><div id="mail-root">'
    + extractBodyForWebView(html)
    + '</div><script>'
    + FIT_SCRIPT
    + '</script></body></html>'
  );
}

type MailNode = {
  tagName?: string;
  attributes?: Record<string, string>;
  parent?: MailNode | null;
  children?: readonly MailNode[];
  data?: string;
};

type ImageRowAlign = 'flex-start' | 'center' | 'flex-end';

function pixelSize(value: string | undefined): number {
  const raw = stripImportant(value || '').trim();

  if (!raw || raw === 'auto' || raw.includes('%')) {
    return 0;
  }

  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function percentSize(value: string | undefined): number {
  const raw = stripImportant(value || '').trim();

  if (!raw.endsWith('%')) {
    return 0;
  }

  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : 0;
}

function stylePropertyRaw(style: string, propName: string): string {
  const pattern = new RegExp(
    `(?:^|[;\\s])${propName}\\s*:\\s*([^;]+)`,
    'i',
  );
  return (style.match(pattern)?.[1] || '').trim();
}

function stylePixelSize(style: string, propName: string): number {
  return pixelSize(stylePropertyRaw(style, propName));
}

function stylePercentSize(style: string, propName: string): number {
  return percentSize(stylePropertyRaw(style, propName));
}

function nodeExplicitPixelWidth(node: MailNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  const style = node.attributes?.style || '';
  const styleWidth = stylePixelSize(style, 'width');
  const styleMaxWidth = stylePixelSize(style, 'max-width');
  const attrWidth = pixelSize(node.attributes?.width);

  let width = styleWidth > 0 ? styleWidth : attrWidth;

  if (styleMaxWidth > 0) {
    width = width > 0 ? Math.min(width, styleMaxWidth) : styleMaxWidth;
  }

  return width;
}

function nodeExplicitPercentWidth(node: MailNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  const style = node.attributes?.style || '';
  return (
    stylePercentSize(style, 'width')
    || stylePercentSize(style, 'max-width')
    || percentSize(node.attributes?.width)
  );
}

function nodeHorizontalPadding(node: MailNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  const style = node.attributes?.style || '';
  let left = stylePixelSize(style, 'padding-left');
  let right = stylePixelSize(style, 'padding-right');

  const shorthand = stripImportant(stylePropertyRaw(style, 'padding'));
  if (shorthand) {
    const parts = shorthand
      .split(/\s+/)
      .map((part) => pixelSize(part));

    if (parts.length === 1 && parts[0] > 0) {
      if (!left) left = parts[0];
      if (!right) right = parts[0];
    } else if (parts.length === 2 || parts.length === 3) {
      if (!left && parts[1] > 0) left = parts[1];
      if (!right && parts[1] > 0) right = parts[1];
    } else if (parts.length >= 4) {
      if (!right && parts[1] > 0) right = parts[1];
      if (!left && parts[3] > 0) left = parts[3];
    }
  }

  return left + right;
}

function hasMeaningfulContent(node: MailNode | null | undefined): boolean {
  if (!node) {
    return false;
  }

  if (node.tagName === 'img') {
    const w = nodeExplicitPixelWidth(node);
    const h = pixelSize(node.attributes?.height)
      || stylePixelSize(node.attributes?.style || '', 'height');

    if ((w > 0 && w <= 3) || (h > 0 && h <= 3)) {
      return false;
    }

    return Boolean(node.attributes?.src);
  }

  if (typeof node.data === 'string') {
    const cleaned = node.data
      .replace(/[\s\u00A0\u200B-\u200D\u2060\uFEFF]+/g, '')
      .trim();
    if (cleaned.length > 0) {
      return true;
    }
  }

  const children = node.children || [];
  for (const child of children) {
    if (hasMeaningfulContent(child)) {
      return true;
    }
  }

  return false;
}

function countTreeTextLength(node: MailNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  let total = 0;

  if (typeof node.data === 'string') {
    total += node.data
      .replace(/[\s\u00A0\u200B-\u200D\u2060\uFEFF]+/g, '')
      .length;
  }

  for (const child of node.children || []) {
    total += countTreeTextLength(child);
  }

  return total;
}

function findFirstImgMaxWidth(node: MailNode | null | undefined): number {
  if (!node) {
    return 0;
  }

  if (node.tagName === 'img') {
    return nodeExplicitPixelWidth(node);
  }

  for (const child of node.children || []) {
    const found = findFirstImgMaxWidth(child);
    if (found > 0) {
      return found;
    }
  }

  return 0;
}

interface CellLayoutAllocation {
  flexGrow: number;
  flexShrink: number;
  flexBasis?: number | `${number}%`;
  width?: number | `${number}%`;
  maxWidth?: number | `${number}%`;
}

function computeTableCellAllocation(
  cell: MailNode,
  rowWidth: number,
): CellLayoutAllocation {
  const parent = cell.parent;
  const siblings = (parent?.children || []).filter(
    (child) => child.tagName === 'td' || child.tagName === 'th',
  );

  if (siblings.length <= 1) {
    return {
      flexGrow: 1,
      flexShrink: 1,
      maxWidth: '100%',
    };
  }

  const pxW = nodeExplicitPixelWidth(cell);
  const pctW = nodeExplicitPercentWidth(cell);
  const isEmptySpacer = !hasMeaningfulContent(cell);

  if (isEmptySpacer) {
    const spacerPx = pxW > 0
      ? Math.min(pxW, Math.round(rowWidth * 0.15))
      : (pctW > 0 ? Math.round((rowWidth * Math.min(pctW, 15)) / 100) : 8);

    return {
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: spacerPx,
      width: spacerPx,
    };
  }

  if (pctW > 0) {
    const safePct = Math.min(pctW, 100) as number;
    return {
      flexGrow: safePct,
      flexShrink: 1,
      flexBasis: `${safePct}%`,
      maxWidth: `${safePct}%`,
    };
  }

  const nonEmptySiblings = siblings.filter((sib) => hasMeaningfulContent(sib));
  const allNonEmptyHavePx = nonEmptySiblings.length > 0
    && nonEmptySiblings.every((sib) => nodeExplicitPixelWidth(sib) > 0);

  if (pxW > 0) {
    if (allNonEmptyHavePx) {
      return {
        flexGrow: pxW,
        flexShrink: 1,
        flexBasis: pxW,
        maxWidth: '100%',
      };
    }

    if (pxW <= rowWidth * 0.45) {
      return {
        flexGrow: 0,
        flexShrink: 1,
        flexBasis: pxW,
        width: pxW,
        maxWidth: '100%',
      };
    }

    return {
      flexGrow: pxW,
      flexShrink: 1,
      flexBasis: pxW,
      maxWidth: '100%',
    };
  }

  const textLen = countTreeTextLength(cell);
  const imgWidth = findFirstImgMaxWidth(cell);

  if (textLen === 0 && imgWidth > 0 && imgWidth <= 140) {
    const compactWidth = imgWidth + nodeHorizontalPadding(cell) + 8;
    return {
      flexGrow: 0,
      flexShrink: 1,
      flexBasis: compactWidth,
      width: compactWidth,
    };
  }

  return {
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: '100%',
  };
}

function estimateNodeAvailableWidth(
  node: MailNode,
  rootWidth: number,
): number {
  const chain: MailNode[] = [];
  let cursor: MailNode | null | undefined = node.parent;

  while (cursor) {
    chain.unshift(cursor);
    cursor = cursor.parent;
  }

  let currentWidth = rootWidth;

  for (const ancestor of chain) {
    const pxW = nodeExplicitPixelWidth(ancestor);
    const pctW = nodeExplicitPercentWidth(ancestor);

    if (pctW > 0 && pctW < 100) {
      currentWidth = Math.min(currentWidth, (currentWidth * pctW) / 100);
    }

    if (pxW > 0) {
      currentWidth = Math.min(currentWidth, pxW);
    }

    if (ancestor.tagName === 'td' || ancestor.tagName === 'th') {
      const siblings = (ancestor.parent?.children || []).filter(
        (child) => child.tagName === 'td' || child.tagName === 'th',
      );

      if (siblings.length > 1 && pxW === 0 && pctW === 0) {
        let fixedUsed = 0;
        let flexSiblings = 0;

        for (const sib of siblings) {
          if (!hasMeaningfulContent(sib)) {
            fixedUsed += nodeExplicitPixelWidth(sib) || 8;
          } else {
            const sibPx = nodeExplicitPixelWidth(sib);
            const sibPct = nodeExplicitPercentWidth(sib);

            if (sibPx > 0) {
              fixedUsed += sibPx;
            } else if (sibPct > 0) {
              fixedUsed += (currentWidth * sibPct) / 100;
            } else {
              const sibText = countTreeTextLength(sib);
              const sibImg = findFirstImgMaxWidth(sib);
              if (sibText === 0 && sibImg > 0 && sibImg <= 140) {
                fixedUsed += sibImg + nodeHorizontalPadding(sib) + 8;
              } else {
                flexSiblings += 1;
              }
            }
          }
        }

        if (flexSiblings > 0) {
          const remaining = Math.max(48, currentWidth - fixedUsed);
          currentWidth = remaining / flexSiblings;
        }
      }
    }

    const padding = nodeHorizontalPadding(ancestor);
    if (padding > 0 && padding < currentWidth - 24) {
      currentWidth -= padding;
    }
  }

  return Math.max(24, Math.floor(currentWidth));
}

function imageRowAlign(node: MailNode): ImageRowAlign {
  const selfStyle = node.attributes?.style || '';
  if (
    /margin-left\s*:\s*auto/i.test(selfStyle)
    && /margin-right\s*:\s*auto/i.test(selfStyle)
  ) {
    return 'center';
  }

  let current: MailNode | null | undefined = node.parent;

  while (current) {
    const alignAttr = (current.attributes?.align || '').trim().toLowerCase();

    if (alignAttr === 'center') {
      return 'center';
    }

    if (alignAttr === 'right' || alignAttr === 'end') {
      return 'flex-end';
    }

    if (alignAttr === 'left' || alignAttr === 'start') {
      return 'flex-start';
    }

    const style = current.attributes?.style || '';
    const textAlign = style.match(
      /text-align\s*:\s*(center|right|left|start|end)/i,
    )?.[1]?.toLowerCase();

    if (textAlign === 'center') {
      return 'center';
    }

    if (textAlign === 'right' || textAlign === 'end') {
      return 'flex-end';
    }

    if (textAlign === 'left' || textAlign === 'start') {
      return 'flex-start';
    }

    if (current.tagName === 'center') {
      return 'center';
    }

    current = current.parent;
  }

  return 'flex-start';
}

function ancestorHref(node: MailNode): string {
  let current = node.parent;

  while (current) {
    const href = current.attributes?.href?.trim() || '';

    if (current.tagName === 'a' && /^https?:\/\//i.test(href)) {
      return href;
    }

    current = current.parent;
  }

  return '';
}

function MailTableCell({
  TDefaultRenderer,
  tnode,
  style,
  ...rest
}: CustomRendererProps<TBlock>) {
  const contentWidth = Math.max(useContentWidth() || 0, 1);
  const allocation = useMemo(
    () => computeTableCellAllocation(tnode as MailNode, contentWidth),
    [contentWidth, tnode],
  );
  const valign = (
    tnode.attributes?.valign
    || tnode.parent?.attributes?.valign
    || stylePropertyRaw(tnode.attributes?.style || '', 'vertical-align')
  )
    .trim()
    .toLowerCase();

  const justifyContent = valign === 'middle' || valign === 'center'
    ? 'center'
    : valign === 'bottom'
      ? 'flex-end'
      : undefined;

  return (
    <TDefaultRenderer
      tnode={tnode}
      style={[
        style,
        {
          flex: undefined,
          flexGrow: allocation.flexGrow,
          flexShrink: allocation.flexShrink,
          flexBasis: allocation.flexBasis,
          width: allocation.width,
          maxWidth: allocation.maxWidth,
          minWidth: 0,
          justifyContent,
        },
      ]}
      {...rest}
    />
  );
}

function MailFitImage({
  tnode,
}: CustomRendererProps<TBlock>) {
  const contentWidth = Math.max(useContentWidth() || 0, 1);
  const attributes = tnode.attributes || {};
  const uri = (attributes.src || '').trim();
  const inlineStyle = attributes.style || '';

  const attrWidth = pixelSize(attributes.width);
  const attrHeight = pixelSize(attributes.height);
  const styleWidth = stylePixelSize(inlineStyle, 'width');
  const styleMaxWidth = stylePixelSize(inlineStyle, 'max-width');
  const styleHeight = stylePixelSize(inlineStyle, 'height');
  const styleMaxHeight = stylePixelSize(inlineStyle, 'max-height');

  const requestedWidth = styleWidth > 0 ? styleWidth : attrWidth;
  const requestedHeight = styleHeight > 0 ? styleHeight : attrHeight;
  const requestedPercentWidth = (
    stylePercentSize(inlineStyle, 'width')
    || percentSize(attributes.width)
  );

  const estimatedAvailableWidth = useMemo(
    () => estimateNodeAvailableWidth(tnode as MailNode, contentWidth),
    [contentWidth, tnode],
  );
  const [measuredContainerWidth, setMeasuredContainerWidth] = useState<number>(0);
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!uri) {
      return undefined;
    }

    let cancelled = false;

    Image.getSize(
      uri,
      (naturalWidth, naturalHeight) => {
        if (!cancelled && naturalWidth > 0 && naturalHeight > 0) {
          setNaturalSize({
            width: naturalWidth,
            height: naturalHeight,
          });
        }
      },
      () => {
        // Si getSize falla, onLoad actualizará las dimensiones reales.
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (
    !uri
    || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(inlineStyle)
    || (requestedWidth > 0 && requestedWidth <= 3)
    || (requestedHeight > 0 && requestedHeight <= 3)
    || (naturalSize && naturalSize.width <= 3 && naturalSize.height <= 3)
  ) {
    return null;
  }

  const availableWidth = Math.max(
    16,
    measuredContainerWidth > 8
      ? Math.min(estimatedAvailableWidth, measuredContainerWidth)
      : estimatedAvailableWidth,
  );

  const maxAllowedWidth = styleMaxWidth > 0
    ? Math.min(availableWidth, styleMaxWidth)
    : availableWidth;

  const aspect = (
    naturalSize && naturalSize.width > 0 && naturalSize.height > 0
      ? naturalSize.width / naturalSize.height
      : (
        requestedWidth > 0 && requestedHeight > 0
          ? requestedWidth / requestedHeight
          : null
      )
  );

  let width: number;

  if (requestedWidth > 0) {
    width = Math.min(requestedWidth, maxAllowedWidth);
  } else if (requestedHeight > 0) {
    const estimatedFromHeight = Math.round(requestedHeight * (aspect || 2.2));
    width = Math.min(estimatedFromHeight, maxAllowedWidth);
  } else if (requestedPercentWidth > 0) {
    const percentTarget = Math.round(
      (availableWidth * Math.min(requestedPercentWidth, 100)) / 100,
    );
    if (naturalSize && naturalSize.width <= 200) {
      width = Math.min(percentTarget, maxAllowedWidth, naturalSize.width);
    } else {
      width = Math.min(percentTarget, maxAllowedWidth);
    }
  } else if (naturalSize) {
    width = Math.min(naturalSize.width, maxAllowedWidth);
  } else {
    width = Math.min(120, maxAllowedWidth);
  }

  width = Math.max(1, Math.round(width));

  let height: number;
  if (aspect && aspect > 0) {
    height = Math.max(1, Math.round(width / aspect));
  } else if (requestedHeight > 0) {
    height = requestedHeight;
  } else {
    height = Math.max(20, Math.round(width / 3));
  }

  if (styleMaxHeight > 0 && height > styleMaxHeight) {
    height = styleMaxHeight;
    if (aspect && aspect > 0) {
      width = Math.max(1, Math.min(width, Math.round(height * aspect)));
    }
  }

  const borderRadius = stylePixelSize(inlineStyle, 'border-radius');
  const rowAlign = imageRowAlign(tnode as MailNode);

  const image = (
    <Image
      source={{ uri }}
      resizeMode="contain"
      resizeMethod="scale"
      style={{
        width,
        height,
        borderRadius: borderRadius > 0 ? borderRadius : undefined,
      }}
      onLoad={(event) => {
        const loadedWidth = event.nativeEvent.source?.width || 0;
        const loadedHeight = event.nativeEvent.source?.height || 0;

        if (loadedWidth > 0 && loadedHeight > 0) {
          setNaturalSize((current) => {
            if (
              current
              && current.width === loadedWidth
              && current.height === loadedHeight
            ) {
              return current;
            }
            return {
              width: loadedWidth,
              height: loadedHeight,
            };
          });
        }
      }}
    />
  );

  const href = ancestorHref(tnode as MailNode);
  const wrappedImage = href ? (
    <Pressable
      accessibilityRole="link"
      onPress={() => openMailLink(href)}
    >
      {image}
    </Pressable>
  ) : image;

  return (
    <View
      onLayout={(event) => {
        const nextWidth = Math.floor(event.nativeEvent.layout.width);

        if (
          nextWidth > 8
          && Math.abs(nextWidth - measuredContainerWidth) > 2
        ) {
          setMeasuredContainerWidth(nextWidth);
        }
      }}
      style={{
        width: '100%',
        maxWidth: '100%',
        alignItems: rowAlign,
      }}
    >
      {wrappedImage}
    </View>
  );
}

function openMailLink(url: string): void {
  if (!/^https?:\/\//i.test(url)) {
    return;
  }

  void Linking.openURL(url).catch(() => {
    // El correo sigue visible si el enlace no se puede abrir.
  });
}

interface MailHtmlViewProps {
  html: string;
  width: number;
}

function ScaledMailHtml({
  html,
  width,
}: MailHtmlViewProps) {
  const preparedHtml = useMemo(
    () => prepareMailHtmlForScaledRender(html),
    [html],
  );
  const layoutWidth = useMemo(
    () => Math.max(detectMailLayoutWidth(preparedHtml), width),
    [preparedHtml, width],
  );
  const scale = layoutWidth > width ? width / layoutWidth : 1;
  const [contentHeight, setContentHeight] = useState(480);

  useEffect(() => {
    setContentHeight(480);
  }, [preparedHtml, width]);

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height: Math.max(120, Math.ceil(contentHeight * scale)),
        },
      ]}
    >
      <View
        collapsable={false}
        onLayout={(event) => {
          const nextHeight = event.nativeEvent.layout.height;

          if (
            nextHeight > 0
            && Math.abs(nextHeight - contentHeight) > 2
          ) {
            setContentHeight(nextHeight);
          }
        }}
        style={{
          width: layoutWidth,
          alignSelf: 'flex-start',
          transformOrigin: '0% 0%',
          transform: [{ scale }],
        }}
      >
        <RenderHTML
          contentWidth={layoutWidth}
          source={{ html: preparedHtml }}
          customHTMLElementModels={CUSTOM_MODELS}
          enableCSSInlineProcessing
          enableUserAgentStyles
          defaultTextProps={{
            selectable: true,
          }}
          ignoredDomTags={[
            'audio',
            'base',
            'embed',
            'form',
            'head',
            'iframe',
            'input',
            'link',
            'meta',
            'object',
            'script',
            'style',
            'title',
            'video',
          ]}
          renderers={{
            img: MailFitImage,
            td: MailTableCell,
            th: MailTableCell,
          }}
          renderersProps={{
            a: {
              onPress: (_event, href) => {
                openMailLink(href);
              },
            },
          }}
          tagsStyles={{
            body: {
              margin: 0,
              padding: 0,
              width: layoutWidth,
              maxWidth: layoutWidth,
              overflow: 'hidden',
            },
            table: {
              maxWidth: '100%',
            },
            tr: {
              maxWidth: '100%',
            },
            div: {
              maxWidth: '100%',
            },
            center: {
              maxWidth: '100%',
            },
          }}
        />
      </View>
    </View>
  );
}

function WebMailHtml({
  html,
  width,
}: MailHtmlViewProps) {
  const WebView = useMemo(
    () => require('react-native-webview').WebView,
    [],
  );
  const documentHtml = useMemo(
    () => buildMailDocument(html),
    [html],
  );
  const [height, setHeight] = useState(480);

  useEffect(() => {
    setHeight(480);
  }, [html, width]);

  return (
    <View style={[styles.frame, { width, height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: documentHtml }}
        style={{
          width,
          height,
          backgroundColor: colors.neutral.white,
        }}
        scrollEnabled={false}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        scalesPageToFit
        androidLayerType="hardware"
        mixedContentMode="always"
        overScrollMode="never"
        onMessage={(event: { nativeEvent: { data: string } }) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              height?: number;
            };
            const nextHeight = Number(payload.height || 0);

            if (
              nextHeight > 40
              && nextHeight < 30000
              && Math.abs(nextHeight - height) > 2
            ) {
              setHeight(nextHeight);
            }
          } catch {
            // Un mensaje ajeno al ajuste de altura no cambia el visor.
          }
        }}
        onShouldStartLoadWithRequest={(
          request: { url?: string },
        ) => {
          const url = request.url || '';

          if (
            !url
            || url === 'about:blank'
            || url.startsWith('about:')
            || url.startsWith('data:')
          ) {
            return true;
          }

          openMailLink(url);
          return false;
        }}
      />
    </View>
  );
}

export default function MailHtmlView(props: MailHtmlViewProps) {
  if (NATIVE_WEBVIEW) {
    return <WebMailHtml {...props} />;
  }

  return <ScaledMailHtml {...props} />;
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
  },
});
