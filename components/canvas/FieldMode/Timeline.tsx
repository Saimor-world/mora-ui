'use client';

interface TimelineProps {
  snapshots: string[];
  current: number;
  onChange: (index: number) => void;
}

export default function Timeline({ snapshots, current, onChange }: TimelineProps) {
  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-center gap-4">
        {/* Label */}
        <div className="text-sm font-medium text-muted-foreground">
          Timeline
        </div>

        {/* Slider */}
        <div className="flex-1 flex items-center gap-3">
          <button
            onClick={() => onChange(Math.max(0, current - 1))}
            disabled={current === 0}
            className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ◀
          </button>

          <div className="flex-1 relative">
            {/* Track */}
            <div className="h-2 bg-secondary rounded-full relative">
              {/* Progress */}
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(current / (snapshots.length - 1)) * 100}%` }}
              />
            </div>

            {/* Markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between">
              {snapshots.map((ts, i) => (
                <button
                  key={ts}
                  onClick={() => onChange(i)}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i === current
                      ? 'bg-primary border-primary scale-125'
                      : 'bg-background border-muted-foreground/50 hover:border-primary/50'
                  }`}
                  style={{ marginTop: '-4px' }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => onChange(Math.min(snapshots.length - 1, current + 1))}
            disabled={current === snapshots.length - 1}
            className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ▶
          </button>
        </div>

        {/* Current snapshot label */}
        <div className="text-sm font-mono text-primary">
          {snapshots[current]}
        </div>

        {/* Stats */}
        <div className="text-xs text-muted-foreground">
          {current + 1} / {snapshots.length}
        </div>
      </div>
    </div>
  );
}
