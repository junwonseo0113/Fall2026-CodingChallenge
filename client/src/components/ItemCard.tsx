import * as React from "react";
import { Pencil, Trash2, ExternalLink, Check, X as XIcon, Mic, Volume2 } from "lucide-react";
import type { CollectionItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/VoiceRecorder";

const WAVE_HEIGHTS = [30, 55, 80, 45, 65, 90, 40, 70, 50, 85, 35, 60, 75, 48, 62, 38];

export function ItemCard({
  item,
  canEdit,
  onEdit,
  onRemove,
  onAttachVoice,
}: {
  item: CollectionItem;
  canEdit: boolean;
  onEdit: (note: string) => Promise<void>;
  onRemove: () => Promise<void>;
  onAttachVoice: (audioData: string, durationSeconds: number) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState(item.note);
  const [saving, setSaving] = React.useState(false);
  const [recorderOpen, setRecorderOpen] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);

  async function saveNote() {
    setSaving(true);
    try {
      await onEdit(note);
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
          {!item.audioData && (
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 bg-[var(--card)]"
              onClick={() => setRecorderOpen(true)}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          )}
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

      {item.audioData && (
        <div className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-2">
          <Volume2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
          <div className="flex h-6 flex-1 items-end gap-[2px]">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-[var(--primary)] transition-all duration-300"
                style={{ height: playing ? `${h}%` : "20%", opacity: playing ? 0.9 : 0.4 }}
              />
            ))}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            src={item.audioData}
            controls
            className="h-7 max-w-[110px]"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
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

      <VoiceRecorder open={recorderOpen} onOpenChange={setRecorderOpen} onSave={onAttachVoice} />
    </div>
  );
}
