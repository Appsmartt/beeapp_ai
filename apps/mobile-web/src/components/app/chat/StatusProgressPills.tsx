'use client';

interface StatusProgressPillsProps {
  count: number;
  index: number;
  progressPercent: number;
  onDark?: boolean;
}

export default function StatusProgressPills({
  count,
  index,
  progressPercent,
}: StatusProgressPillsProps) {
  const pills = Array.from({ length: count });

  return (
    <div className="flex items-center gap-1.5 px-4 pt-3 w-full">
      {pills.map((_, i) => {
        let fillWidth = '0%';
        if (i < index) fillWidth = '100%';
        else if (i === index) fillWidth = `${progressPercent}%`;

        return (
          <div
            key={i}
            className="flex-1 h-1 rounded-full overflow-hidden bg-white/30"
          >
            <div
              className="h-full bg-brand-primary transition-all duration-75"
              style={{ width: fillWidth }}
            />
          </div>
        );
      })}
    </div>
  );
}
