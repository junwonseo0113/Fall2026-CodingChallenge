import * as React from "react";
import { useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { MasonryGrid } from "@/components/MasonryGrid";
import { LockedCollectionView } from "@/components/LockedCollectionView";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PublicCollectionData {
  id: string;
  name: string;
  description: string;
  isLocked: boolean;
  unlockAt: string | null;
  items: {
    id: string;
    imageUrl: string;
    thumbUrl: string;
    sourceUrl?: string;
    title: string;
    note: string;
  }[];
}

export function PublicCollection() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = React.useState<PublicCollectionData | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(() => {
    api
      .get(`/public/${slug}`)
      .then((res) => setCollection(res.data.collection))
      .catch((err) => {
        toast.error(apiErrorMessage(err, "This collection is not available"));
        setNotFound(true);
      });
  }, [slug]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
            Pinboard
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {notFound && (
          <p className="text-center text-[var(--muted-foreground)]">
            This collection isn't available or is no longer public.
          </p>
        )}

        {collection && (
          <>
            <h1 className="text-2xl font-semibold">{collection.name}</h1>
            {collection.description && (
              <p className="mt-1 max-w-xl text-[var(--muted-foreground)]">{collection.description}</p>
            )}
            {collection.isLocked ? (
              <LockedCollectionView unlockAt={collection.unlockAt!} onUnlocked={load} />
            ) : (
              <MasonryGrid className="mt-6">
                {collection.items.map((item) => (
                  <div key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)]">
                    <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full object-cover" />
                    {item.note && <p className="p-3 text-sm text-[var(--muted-foreground)]">{item.note}</p>}
                  </div>
                ))}
              </MasonryGrid>
            )}
          </>
        )}
      </main>
    </div>
  );
}
