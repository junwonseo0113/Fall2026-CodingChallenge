import * as React from "react";
import { Search, Plus, Check, Link2, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { unsplashConfigured } from "@/lib/config";
import type { SearchResult } from "@/lib/types";
import { colorPlaceholderStyle } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function isValidImageUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function ImageSearchDialog({
  open,
  onOpenChange,
  onAdd,
  savedImageUrls,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (result: SearchResult) => Promise<void>;
  savedImageUrls: Set<string>;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pastedUrl, setPastedUrl] = React.useState("");
  const [addingPasted, setAddingPasted] = React.useState(false);
  const pasteInputRef = React.useRef<HTMLInputElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  // null while checking; false hides the search box entirely and jumps straight
  // to the paste-link form instead of firing a request that's guaranteed to fail.
  const [hasUnsplash, setHasUnsplash] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    unsplashConfigured().then(setHasUnsplash);
  }, []);

  // Search being unavailable forces the paste form open -- derived directly
  // rather than synced via an effect, since it's just a function of state.
  const showPasteForm = pasteOpen || hasUnsplash === false;

  const runSearch = React.useCallback(async (q: string, nextPage: number) => {
    if (!q.trim() || hasUnsplash === false) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/search", { params: { q, page: nextPage } });
      setTotalPages(res.data.totalPages);
      setResults((prev) => (nextPage === 1 ? res.data.results : [...prev, ...res.data.results]));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Image search failed"));
    } finally {
      setLoading(false);
    }
  }, [hasUnsplash]);

  // Debounce search-as-you-type.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      runSearch(query, 1);
    }, 400);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  // Infinite scroll: load the next page once the sentinel enters view.
  React.useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && page < totalPages) {
        const next = page + 1;
        setPage(next);
        runSearch(query, next);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, page, totalPages, query, runSearch]);

  async function handleAdd(result: SearchResult) {
    setAddingId(result.id);
    try {
      await onAdd(result);
    } finally {
      setAddingId(null);
    }
  }

  async function handleAddPastedUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidImageUrl(pastedUrl)) {
      toast.error("That doesn't look like a valid URL");
      return;
    }
    setAddingPasted(true);
    try {
      // Resolves the link server-side: an Unsplash photo page becomes its full-res
      // asset + attribution, a direct image URL passes through, and anything else
      // gets its og:image scraped -- so pasting a page link works, not just a raw image URL.
      const resolved = await api.get("/resolve-url", { params: { url: pastedUrl } });
      await onAdd({
        id: pastedUrl,
        title: "",
        imageUrl: resolved.data.imageUrl,
        thumbUrl: resolved.data.thumbUrl,
        sourceUrl: resolved.data.sourceUrl,
        credit: resolved.data.credit,
        creditUrl: resolved.data.creditUrl,
        downloadLocation: resolved.data.downloadLocation,
        color: resolved.data.color,
      });
      setPastedUrl("");
      setPasteOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't find an image at that URL"));
    } finally {
      setAddingPasted(false);
    }
  }

  React.useEffect(() => {
    if (showPasteForm) pasteInputRef.current?.focus();
  }, [showPasteForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Search images</DialogTitle>
        </DialogHeader>
        {hasUnsplash === false ? (
          <p className="mb-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
            Image search isn't configured for this deployment -- paste a link below to add a photo.
          </p>
        ) : (
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              autoFocus
              placeholder="Search Unsplash for photos..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}

        {showPasteForm ? (
          <form onSubmit={handleAddPastedUrl} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                ref={pasteInputRef}
                placeholder="Paste an image or Unsplash link..."
                className="h-9 pl-8 text-sm"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={!pastedUrl || addingPasted}>
              {addingPasted ? "Adding..." : "Add"}
            </Button>
            {hasUnsplash !== false && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                onClick={() => {
                  setPasteOpen(false);
                  setPastedUrl("");
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </form>
        ) : (
          <button
            type="button"
            className="mb-4 flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            onClick={() => setPasteOpen(true)}
          >
            <Link2 className="h-3 w-3" /> Or paste a link instead
          </button>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map((result) => {
              const saved = savedImageUrls.has(result.imageUrl);
              return (
                <div
                  key={result.id}
                  className="group relative overflow-hidden rounded-xl"
                  style={colorPlaceholderStyle(result.color)}
                >
                  <img src={result.thumbUrl} alt={result.title} className="aspect-square w-full object-cover" />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={saved || addingId === result.id}
                      onClick={() => handleAdd(result)}
                    >
                      {saved ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Saved
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          {addingId === result.id ? "Saving..." : "Save"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {query && (
            <div ref={sentinelRef} className="py-6 text-center text-sm text-[var(--muted-foreground)]">
              {loading ? "Loading more..." : results.length === 0 ? "No results" : ""}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
