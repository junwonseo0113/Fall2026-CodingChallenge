import * as React from "react";
import { Pencil, Trash2, ExternalLink, Check, X as XIcon } from "lucide-react";
import type { CollectionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const QUICK_TAGS = ["wallpaper", "reference", "profile"] as const;

export function ItemCard({
  item,
  canEdit,
  onEdit,
  onRemove,
}: {
  item: CollectionItem;
  canEdit: boolean;
  onEdit: (note: string, tags: string[]) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState(item.note);
  const [tags, setTags] = React.useState<string[]>(item.tags);
  const [saving, setSaving] = React.useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function saveNote() {
    setSaving(true);
    try {
      await onEdit(note, tags);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
      <img
        src={item.imageUrl}
        alt={item.title}
        loading="lazy"
        className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />

      {canEdit && (
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon" variant="outline" className="h-8 w-8 bg-[var(--card)]" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute left-2 top-2 rounded-full bg-[var(--card)]/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {!editing && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-3">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--muted-foreground)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {(item.note || editing) && (
        <div className="p-3">
          {editing ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-16 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                      tags.includes(tag)
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" className="h-7 w-7" disabled={saving} onClick={saveNote}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">{item.note}</p>
          )}
        </div>
      )}

      {item.credit && (
        <div className="border-t border-[var(--border)] px-3 py-1.5">
          {item.creditUrl ? (
            <a
              href={item.creditUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline"
            >
              Photo by {item.credit} on Unsplash
            </a>
          ) : (
            <span className="text-[10px] text-[var(--muted-foreground)]">Photo by {item.credit}</span>
          )}
        </div>
      )}
    </div>
  );
}
