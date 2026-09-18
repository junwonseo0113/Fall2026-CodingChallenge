import * as React from "react";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import type { Collection, TodayVisual as TodayVisualData } from "@/lib/types";
import { getCurrentPosition } from "@/lib/geolocation";
import { unsplashConfigured } from "@/lib/config";
import { colorPlaceholderStyle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/**
 * A "today's pick" banner matched to the viewer's local time of day and, if
 * location permission is granted, current weather (e.g. a rainy evening
 * surfaces a moody sunset pick). Entirely optional/best-effort: geolocation
 * denial just falls back to time-of-day only, and if the backend can't
 * produce a pick at all (e.g. no Unsplash key configured) the banner simply
 * doesn't render rather than showing an error the user didn't ask for.
 */
export function TodayVisual({ collections, onSaved }: { collections: Collection[]; onSaved: () => void }) {
  const [data, setData] = React.useState<TodayVisualData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingTo, setSavingTo] = React.useState<string | null>(null);
  const [savedTo, setSavedTo] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      // No point prompting for geolocation or hitting the API if the server
      // can't produce a pick anyway -- skip straight to "don't render".
      if (!(await unsplashConfigured())) {
        if (!cancelled) setLoading(false);
        return;
      }

      const hour = new Date().getHours();
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        // Weather is a nice-to-have, not worth stalling the banner on -- if
        // the permission prompt sits unanswered, give up on location after a
        // few seconds rather than waiting out the browser's own long timeout.
        const position = await Promise.race([
          getCurrentPosition(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), 3000)),
        ]);
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } catch {
        // Not supported, permission denied, or timed out -- proceed with time-of-day only.
      }

      try {
        const res = await api.get("/today-visual", { params: { hour, lat, lon } });
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(collectionId: string) {
    if (!data?.result) return;
    setSavingTo(collectionId);
    try {
      const { result } = data;
      await api.post(`/collections/${collectionId}/items`, {
        imageUrl: result.imageUrl,
        thumbUrl: result.thumbUrl,
        sourceUrl: result.sourceUrl,
        title: result.title,
        credit: result.credit,
        creditUrl: result.creditUrl,
        downloadLocation: result.downloadLocation,
        color: result.color,
      });
      setSavedTo((prev) => new Set(prev).add(collectionId));
      toast.success("Saved to collection");
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save image"));
    } finally {
      setSavingTo(null);
    }
  }

  if (loading) {
    return <div className="mb-8 h-56 animate-pulse rounded-2xl bg-[var(--muted)] sm:h-72" />;
  }

  if (!data?.result) return null;

  const { result, summary } = data;

  return (
    <div
      className="relative mb-8 h-56 overflow-hidden rounded-2xl border border-[var(--border)] shadow-[var(--shadow-md)] sm:h-72"
      style={colorPlaceholderStyle(result.color)}
    >
      <img src={result.thumbUrl} alt={result.title || summary} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Today's visual</p>
          <p className="mt-1 truncate text-xl font-semibold text-white">{summary}</p>
          {result.credit && <p className="mt-1 text-xs text-white/70">Photo by {result.credit} on Unsplash</p>}
        </div>

        {collections.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="shrink-0 bg-[var(--card)]" disabled={savingTo !== null}>
                <Plus className="h-3.5 w-3.5" />
                Save to...
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {collections.map((c) => (
                <DropdownMenuItem key={c.id} disabled={savingTo === c.id} onSelect={() => handleSave(c.id)}>
                  {savedTo.has(c.id) && <Check className="h-3.5 w-3.5" />}
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
