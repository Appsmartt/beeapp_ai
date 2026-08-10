'use client';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const ORB_SIZE = 240;
const C = ORB_SIZE / 2;

/**
 * Blob orgánico: un círculo cuyo radio ondula, para que nunca se vea perfecto.
 * Portado literalmente de `VoiceOrb.tsx` de la app móvil.
 */
const blobPath = (radius: number, wobble: number, seed: number) => {
  const steps = 12;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = radius + Math.sin(a * 3 + seed) * wobble + Math.cos(a * 2 + seed * 1.7) * wobble * 0.6;
    pts.push({ x: C + Math.cos(a) * r, y: C + Math.sin(a) * r });
  }
  let d = `M ${((pts[0].x + pts[steps - 1].x) / 2).toFixed(1)} ${((pts[0].y + pts[steps - 1].y) / 2).toFixed(1)}`;
  for (let i = 0; i < steps; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % steps];
    d += ` Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)} ${((cur.x + next.x) / 2).toFixed(1)} ${((cur.y + next.y) / 2).toFixed(1)}`;
  }
  return `${d} Z`;
};

const LAYERS = [
  { d: blobPath(96, 10, 0), color: '#8B5CF6', opacity: 0.32, speed: 9000, dir: 1 },
  { d: blobPath(84, 14, 2.1), color: '#A78BFA', opacity: 0.34, speed: 6500, dir: -1 },
  { d: blobPath(70, 9, 4.3), color: '#C4B5FD', opacity: 0.4, speed: 4800, dir: 1 },
];

/** Multiplicador de velocidad por estado, igual que en móvil */
const SPEED_FACTOR: Record<OrbState, number> = {
  listening: 0.45,
  speaking: 0.6,
  thinking: 0.85,
  idle: 1,
};

interface VoiceOrbProps {
  state: OrbState;
}

/**
 * Visual orgánico animado: capas de blobs girando a distintas velocidades con
 * un pulso de respiración. Se mueve más al escuchar o responder y se calma en
 * reposo.
 */
export default function VoiceOrb({ state }: VoiceOrbProps) {
  const active = state === 'listening' || state === 'speaking';
  const factor = SPEED_FACTOR[state];

  // Mismos valores que las interpolaciones Animated de móvil
  const pulseVars = {
    '--orb-scale': active ? '1.12' : '1.04',
    '--halo-from': active ? '0.35' : '0.16',
    '--halo-to': active ? '0.08' : '0.05',
  } as React.CSSProperties;

  // En móvil el pulso son dos timings de 700 ms (activo) o 1800 ms (reposo)
  const pulseDuration = `${(active ? 700 : 1800) * 2}ms`;

  return (
    <div
      className="relative shrink-0"
      style={{ width: ORB_SIZE, height: ORB_SIZE, ...pulseVars }}
    >
      {/* Halo exterior */}
      <div
        className="absolute inset-0 rounded-full bg-[#A78BFA]"
        style={{
          animation: `voice-orb-halo ${pulseDuration} ease-in-out infinite`,
        }}
      />

      {/* Capas + núcleo, respirando en conjunto */}
      <div
        className="absolute inset-0"
        style={{ animation: `voice-orb-pulse ${pulseDuration} ease-in-out infinite` }}
      >
        {LAYERS.map((layer, index) => (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              animation: `${
                layer.dir === 1 ? 'voice-orb-spin' : 'voice-orb-spin-reverse'
              } ${layer.speed * factor}ms linear infinite`,
            }}
          >
            <svg width={ORB_SIZE} height={ORB_SIZE} aria-hidden>
              <path d={layer.d} fill={layer.color} fillOpacity={layer.opacity} />
            </svg>
          </div>
        ))}

        {/* Núcleo estático: mantiene la forma legible mientras las capas giran */}
        <svg className="absolute inset-0" width={ORB_SIZE} height={ORB_SIZE} aria-hidden>
          <circle cx={C} cy={C} r={46} fill="#DDD6FE" fillOpacity={0.9} />
          <circle cx={C} cy={C} r={30} fill="#FFFFFF" fillOpacity={0.65} />
        </svg>
      </div>
    </div>
  );
}
