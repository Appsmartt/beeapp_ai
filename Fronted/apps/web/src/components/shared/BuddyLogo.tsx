import Image from 'next/image';

type BuddyLogoProps = {
  height?: number;
  width?: number;
  showText?: boolean;
  inverted?: boolean;
  className?: string;
};

type BuddyLogoMarkProps = {
  size?: number;
  width?: number;
  className?: string;
};

/**
 * Símbolo estático de Buddy para espacios compactos:
 * rail de módulos, registro y favicon visual.
 */
export function BuddyLogoMark({
  size = 32,
  width,
  className,
}: BuddyLogoMarkProps) {
  const resolvedWidth = width ?? size;

  return (
    <Image
      src="/branding/logo.png"
      alt="Buddy AI"
      width={resolvedWidth}
      height={size}
      className={className}
      style={{
        width: `${resolvedWidth}px`,
        height: `${size}px`,
        objectFit: 'contain',
      }}
    />
  );
}

/**
 * Marca estática de Buddy AI. Usa el wordmark cuando showText es true
 * y el símbolo cuadrado cuando se necesita la versión compacta.
 *
 * `inverted` se conserva para compatibilidad con el footer, pero el
 * asset no cambia automáticamente de color. Se debe validar el
 * contraste del PNG sobre fondo oscuro.
 */
export default function BuddyLogo({
  height = 36,
  width,
  showText = true,
  inverted = false,
  className,
}: BuddyLogoProps) {
  if (!showText) {
    return (
      <BuddyLogoMark
        size={height}
        width={width}
        className={className}
      />
    );
  }

  const naturalWidth = 1600;
  const naturalHeight = 600;
  const resolvedHeight = height;
  const resolvedWidth = width ?? Math.round(
    resolvedHeight * (naturalWidth / naturalHeight),
  );

  return (
    <Image
      src="/branding/logoletras.png"
      alt="Buddy AI"
      width={resolvedWidth}
      height={resolvedHeight}
      className={className}
      style={{
        width: `${resolvedWidth}px`,
        height: `${resolvedHeight}px`,
        objectFit: 'contain',
        filter: inverted ? 'brightness(0) invert(1)' : undefined,
      }}
    />
  );
}
