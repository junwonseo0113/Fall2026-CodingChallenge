import { Users } from "lucide-react";

/** "3 / 4 sealed" -- a count only, never identities, so it doesn't spoil the blind seal. */
export function ParticipationBadge({ sealed, total }: { sealed: number; total: number }) {
  if (total <= 1) return null; // just the owner, nothing to compare against

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)]">
      <Users className="h-3 w-3" />
      {sealed} / {total} sealed
    </span>
  );
}
