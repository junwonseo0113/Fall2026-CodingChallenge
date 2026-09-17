import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import type { Collection, SearchResult } from "@/lib/types";
import { relativeTime } from "@/lib/relativeTime";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { MasonryGrid } from "@/components/MasonryGrid";
import { ItemCard } from "@/components/ItemCard";
import { ImageSearchDialog } from "@/components/ImageSearchDialog";
import { EditCollectionDialog } from "@/components/EditCollectionDialog";

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = React.useState<Collection | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await api.get(`/collections/${id}`);
      setCollection(res.data.collection);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to load collection"));
      navigate("/");
    }
  }, [id, navigate]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!collection) {
    return (
      <div>
        <Navbar />
        <p className="p-8 text-center text-[var(--muted-foreground)]">Loading...</p>
      </div>
    );
  }

  const isOwner = collection.owner.id === user?.id;
  const canEdit =
    isOwner || collection.collaborators.some((c) => c.id === user?.id);

  async function handleAddFromSearch(result: SearchResult) {
    try {
      const res = await api.post(`/collections/${id}/items`, {
        imageUrl: result.imageUrl,
        thumbUrl: result.thumbUrl,
        sourceUrl: result.sourceUrl,
        title: result.title,
      });
      setCollection(res.data.collection);
      toast.success("Saved to collection");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save image"));
    }
  }

  async function handleEditItem(itemId: string, note: string) {
    try {
      const res = await api.patch(`/collections/${id}/items/${itemId}`, { note });
      setCollection(res.data.collection);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update item"));
    }
  }

  async function handleRemoveItem(itemId: string) {
    const previous = collection;
    setCollection((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev));
    try {
      await api.delete(`/collections/${id}/items/${itemId}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to remove item"));
      setCollection(previous);
    }
  }

  async function handleUpdateDetails(name: string, description: string) {
    try {
      const res = await api.patch(`/collections/${id}`, { name, description });
      setCollection(res.data.collection);
      toast.success("Collection updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update collection"));
    }
  }

  async function handleDeleteCollection() {
    if (!window.confirm(`Delete "${collection!.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/collections/${id}`);
      toast.success("Collection deleted");
      navigate("/");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to delete collection"));
    }
  }

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" /> All collections
        </Link>

        <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{collection.name}</h1>
            {collection.description && (
              <p className="mt-1 max-w-xl text-[var(--muted-foreground)]">{collection.description}</p>
            )}
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              by {collection.owner.name}
              {collection.lastActivity?.by && (
                <>
                  {" "}
                  · {collection.lastActivity.by.name} {collection.lastActivity.action}{" "}
                  {relativeTime(collection.lastActivity.at)}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button onClick={() => setSearchOpen(true)}>
                <ImagePlus className="h-4 w-4" />
                Add images
              </Button>
            )}
            {isOwner && <EditCollectionDialog collection={collection} onSave={handleUpdateDetails} />}
            {isOwner && (
              <Button variant="destructive" size="icon" onClick={handleDeleteCollection}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {collection.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
            No images saved yet.{" "}
            {canEdit && (
              <button className="font-medium text-[var(--primary)]" onClick={() => setSearchOpen(true)}>
                Search for some
              </button>
            )}
          </div>
        ) : (
          <MasonryGrid className="mt-6">
            {collection.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                canEdit={canEdit}
                onEdit={(note) => handleEditItem(item.id, note)}
                onRemove={() => handleRemoveItem(item.id)}
              />
            ))}
          </MasonryGrid>
        )}
      </main>

      <ImageSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onAdd={handleAddFromSearch}
        savedImageUrls={new Set(collection.items.map((i) => i.imageUrl))}
      />
    </div>
  );
}
