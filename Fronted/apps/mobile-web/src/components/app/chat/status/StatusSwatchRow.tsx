'use client';

interface StatusSwatchRowProps {
  /** Valores CSS de `background`: color plano o degradado */
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
  /** Lado del círculo en px. 28 en el panel de escritorio */
  size?: number;
}

/**
 * Fila de círculos de color para elegir color de texto o fondo del estado.
 * El seleccionado se marca con un anillo brand-primary separado del círculo,
 * para que el color propio se siga viendo completo.
 */
export default function StatusSwatchRow({
  values,
  selected,
  onSelect,
  size = 28,
}: StatusSwatchRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const isSelected = value === selected;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-label={`Color ${value}`}
            aria-pressed={isSelected}
            style={{
              width: size,
              height: size,
              background: value,
              boxShadow: 'inset 0 1px 3px rgba(15, 14, 23, 0.14)',
            }}
            className={`rounded-full shrink-0 ring-1 ring-neutral-200 transition-transform duration-200 hover:scale-105 ${
              isSelected
                ? 'outline outline-2 outline-offset-2 outline-brand-primary'
                : ''
            }`}
          />
        );
      })}
    </div>
  );
}
