import * as React from "react";
import { Lock } from "lucide-react";
import { ParticipationBadge } from "@/components/ParticipationBadge";

function countdownParts(target: Date) {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** Shown to non-owners while a collection is time-locked; ticks down live and
 * calls onUnlocked once the clock hits zero so the page can refetch. */
export function LockedCollectionView({
  unlockAt,
  participation,
  onUnlocked,
}: {
  unlockAt: string;
  participation?: { sealed: number; total: number };
  onUnlocked: () => void;
}) {
  const target = React.useMemo(() => new Date(unlockAt), [unlockAt]);
  const [parts, setParts] = React.useState(() => countdownParts(target));

  React.useEffect(() => {
    const interval = setInterval(() => {
      const next = countdownParts(target);
      setParts(next);
      if (next.days === 0 && next.hours === 0 && next.minutes === 0 && next.seconds === 0) {
        onUnlocked();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, onUnlocked]);

  return (
    <div className="mt-10 flex flex-col items-center gap-6 rounded-2xl border border-dashed border-[var(--border)] p-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)] shadow-[var(--shadow-glow)]">
        <Lock className="h-7 w-7 text-[var(--primary)]" />
      </span>
      <div>
        <h2 className="text-lg font-semibold">This collection is locked</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          It unlocks on {target.toLocaleString()}
        </p>
      </div>
      {participation && <ParticipationBadge sealed={participation.sealed} total={participation.total} />}
      <div className="flex gap-3">
        {[
          { label: "Days", value: parts.days },
          { label: "Hours", value: parts.hours },
          { label: "Min", value: parts.minutes },
          { label: "Sec", value: parts.seconds },
        ].map(({ label, value }) => (
          <div key={label} className="min-w-16 rounded-xl bg-[var(--muted)] px-4 py-3">
            <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--primary)]">
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
