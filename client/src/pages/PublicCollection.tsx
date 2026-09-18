import * as React from "react";
import { useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { MasonryGrid } from "@/components/MasonryGrid";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PublicCollectionData {
  id: string;
  name: string;
  description: string;
  items: {
    id: string;
    imageUrl: string;
    thumbUrl: string;
    sourceUrl?: string;
    title: string;
    note: string;
    credit: string;
    creditUrl: string;
    tags: string[];
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
            <MasonryGrid className="mt-6">
              {collection.items.map((item) => (
                <div key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)]">
                  <img src={item.imageUrl} alt={item.title} loading="lazy" className="w-full object-cover" />
                  {item.tags.length > 0 && (
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
                  {item.note && <p className="p-3 text-sm text-[var(--muted-foreground)]">{item.note}</p>}
                  {item.credit && (
                    <div className="border-t border-[var(--border)] px-3 py-1.5">
                      {item.creditUrl ? (
                        <a
                          href={item.creditUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-[var(--muted-foreground)] hover:underline"
                        >
                          Photo by {item.credit} on Unsplash
                        </a>
                      ) : (
                        <span className="text-[10px] text-[var(--muted-foreground)]">Photo by {item.credit}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </MasonryGrid>
          </>
        )}
      </main>
    </div>
  );
}
