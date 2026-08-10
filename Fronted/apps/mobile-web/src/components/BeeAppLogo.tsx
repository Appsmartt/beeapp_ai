/**
 * Logo de BeeApp AI para la web, equivalente estático del `AnimatedLogo` de la
 * app móvil: dos "alas" (cuadrados redondeados morados al 35%, uno girado 45°),
 * un cuadrado blanco central girado 12° y, dentro, una retícula 2x2 de cuatro
 * cuadrados morados.
 *
 * Conserva las proporciones de móvil tomando el cuadrado central como 100
 * unidades: alas de 125 (radio 28), cuadrado central de radio 25 y retícula de
 * 52 con celdas de 23 (radio 6).
 */

const BRAND = 'var(--brand-primary, #6025d2)';

/** Posiciones de la retícula 2x2 dentro del cuadrado central */
const GRID = [
  [49, 49],
  [78, 49],
  [49, 78],
  [78, 78],
];

interface BeeAppLogoMarkProps {
  /** Alto del ícono en px */
  size?: number;
  /** Ancho del ícono en px (por defecto igual al alto) */
  width?: number;
  className?: string;
}

/** Solo el ícono, sin texto. Es también la base del favicon. */
export function BeeAppLogoMark({ size = 32, width, className }: BeeAppLogoMarkProps) {
  return (
    <svg
      width={width ?? size}
      height={size}
      viewBox="0 0 150 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BeeApp AI"
      className={className}
    >
      {/* Alas: cuadrados redondeados morados semitransparentes, uno girado 45° */}
      <rect x="12.5" y="12.5" width="125" height="125" rx="28" fill={BRAND} opacity="0.35" />
      <rect
        x="12.5"
        y="12.5"
        width="125"
        height="125"
        rx="28"
        fill={BRAND}
        opacity="0.35"
        transform="rotate(45 75 75)"
      />

      {/* Cuadrado central blanco, girado 12°, con la retícula 2x2 dentro */}
      <g transform="rotate(12 75 75)">
        <rect x="25" y="25" width="100" height="100" rx="25" fill="#FFFFFF" />
        {GRID.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="23" height="23" rx="6" fill={BRAND} />
        ))}
      </g>
    </svg>
  );
}

interface BeeAppLogoProps {
  /** Alto del ícono en px; el texto escala a partir de él */
  height?: number;
  /** Ancho del ícono en px (por defecto, cuadrado) */
  width?: number;
  /** Muestra "BeeApp AI" junto al ícono */
  showText?: boolean;
  /** Pinta "BeeApp" en blanco, para fondos oscuros */
  inverted?: boolean;
  className?: string;
}

/** Ícono + marca denominativa: "BeeApp" en oscuro (o blanco) y "AI" en morado */
export default function BeeAppLogo({
  height = 36,
  width,
  showText = true,
  inverted = false,
  className,
}: BeeAppLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <BeeAppLogoMark size={height} width={width} className="shrink-0" />

      {showText && (
        <span
          className="font-semibold tracking-tight whitespace-nowrap"
          style={{ fontSize: Math.max(14, Math.round(height * 0.52)) }}
        >
          <span className={inverted ? 'text-white' : 'text-neutral-900'}>BeeApp</span>{' '}
          <span className="text-brand-primary">AI</span>
        </span>
      )}
    </span>
  );
}
