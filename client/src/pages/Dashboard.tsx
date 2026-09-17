import * as React from "react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CollectionCard } from "@/components/CollectionCard";
import { CreateCollectionDialog } from "@/components/CreateCollectionDialog";

export function Dashboard() {
  const { user } = useAuth();
  const [collections, setCollections] = React.useState<Collection[] | null>(null);

  const loadCollections = React.useCallback(async () => {
    try {
      const res = await api.get("/collections");
      setCollections(res.data.collections);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to load collections"));
    }
  }, []);

  React.useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  async function handleCreate(name: string, description: string, unlockAt: string) {
    try {
      await api.post("/collections", {
        name,
        description,
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : undefined,
      });
      toast.success("Collection created");
      loadCollections();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create collection"));
    }
  }

  const owned = collections?.filter((c) => c.owner.id === user?.id) ?? [];
  const shared = collections?.filter((c) => c.owner.id !== user?.id) ?? [];

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your collections</h1>
          <CreateCollectionDialog onCreate={handleCreate} />
        </div>

        {collections === null ? (
          <p className="text-[var(--muted-foreground)]">Loading...</p>
        ) : (
          <>
            {owned.length === 0 && shared.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
                You don't have any collections yet. Create your first one to start saving images.
              </div>
            )}

            {owned.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {owned.map((c) => (
                  <CollectionCard key={c.id} collection={c} isOwner />
                ))}
              </div>
            )}

            {shared.length > 0 && (
              <div className="mt-10">
                <h2 className="mb-4 text-lg font-semibold">Shared with you</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shared.map((c) => (
                    <CollectionCard key={c.id} collection={c} isOwner={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
