import * as React from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";
import type { CollectionItem } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const WAVE_HEIGHTS = [30, 55, 80, 45, 65, 90, 40, 70, 50, 85, 35, 60, 75, 48, 62, 38, 55, 72, 42, 66];

/** Plays every voice note in a collection back to back, like a little radio
 * segment -- the "unlocked" counterpart to the locked countdown. */
export function RadioPlayer({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CollectionItem[]; // pre-filtered to items that actually have audio
}) {
  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (playing) {
      audioRef.current?.play().catch(() => setPlaying(false));
    } else {
      audioRef.current?.pause();
    }
  }, [playing, index]);

  const current = items[index];

  function next() {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
    setPlaying(true);
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <div className="relative aspect-square w-full bg-black">
          <img src={current.imageUrl} alt={current.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white">
            <div className="flex h-8 items-end gap-[2px]">
              {WAVE_HEIGHTS.map((h, i) => (
                <span
                  key={i}
                  className="w-full rounded-full bg-white transition-all duration-300"
                  style={{ height: playing ? `${h}%` : "20%", opacity: playing ? 0.9 : 0.5 }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/70">
              <span>
                {index + 1} / {items.length}
              </span>
              <span>{current.addedBy?.name ?? "Someone"}</span>
            </div>

            {current.note && <p className="text-sm text-white/90">{current.note}</p>}

            <div className="flex items-center justify-center gap-5 pt-1">
              <button
                type="button"
                aria-label="Previous voice note"
                onClick={prev}
                disabled={index === 0}
                className="text-white/80 hover:text-white disabled:opacity-30"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => setPlaying((p) => !p)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                type="button"
                aria-label="Next voice note"
                onClick={next}
                disabled={index === items.length - 1}
                className="text-white/80 hover:text-white disabled:opacity-30"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} src={current.audioData ?? undefined} onEnded={next} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
