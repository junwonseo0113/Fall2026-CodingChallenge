import * as React from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Ticks every 15s (display granularity is minutes, not seconds) for as long as this is mounted. */
function useClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * The phone-bezel mockup itself, rendered only while the dialog is open (see
 * below) -- so its clock's mount/unmount lifecycle naturally starts and
 * stops the interval with the dialog, instead of every saved item's
 * (usually unopened) preview running a background timer forever.
 */
function WallpaperMockup({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const now = useClock();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="relative aspect-[9/19.5] w-full max-w-[240px] overflow-hidden rounded-[2.75rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
      <img src={imageUrl} alt={alt} className="absolute inset-0 h-full w-full object-cover" />

      {/* Dynamic-island-style notch */}
      <div className="absolute left-1/2 top-2 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

      {/* Live lock-screen clock */}
      <div className="absolute inset-x-0 top-16 flex flex-col items-center text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
        <span className="text-5xl font-semibold tabular-nums">{time}</span>
        <span className="mt-1 text-xs font-medium">{date}</span>
      </div>
    </div>
  );
}

/**
 * Shows a saved image inside a phone-bezel mockup with a live lock-screen
 * clock overlaid, so it's easy to judge how an image would actually look
 * as a wallpaper before committing to it. The bezel is drawn with plain
 * CSS (no image assets to ship/load) and the photo is `object-cover`d to
 * the screen's aspect ratio regardless of its own dimensions.
 */
export function WallpaperPreviewDialog({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-[var(--card)]" title="Preview as wallpaper">
          <Smartphone className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-w-xs flex-col items-center">
        <DialogHeader className="w-full">
          <DialogTitle>Wallpaper preview</DialogTitle>
        </DialogHeader>

        {open && <WallpaperMockup imageUrl={imageUrl} alt={alt} />}

        <p className="mt-3 text-center text-xs text-[var(--muted-foreground)]">
          A live preview of this image as a phone lock-screen wallpaper.
        </p>
      </DialogContent>
    </Dialog>
  );
}
