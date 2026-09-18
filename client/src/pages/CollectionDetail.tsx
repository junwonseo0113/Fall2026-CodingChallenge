import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Play, Search, Trash2 } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import type { Collection, SearchResult } from "@/lib/types";
import { relativeTime } from "@/lib/relativeTime";
import { useCollectionActivityNotifications } from "@/hooks/useCollectionActivityNotifications";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MasonryGrid } from "@/components/MasonryGrid";
import { ItemCard } from "@/components/ItemCard";
import { ImageSearchDialog } from "@/components/ImageSearchDialog";
import { ShareDialog } from "@/components/ShareDialog";
import { EditCollectionDialog } from "@/components/EditCollectionDialog";
import { LockedCollectionView } from "@/components/LockedCollectionView";
import { GeoUnlockPrompt } from "@/components/GeoUnlockPrompt";
import { CollectionLockBanners } from "@/components/CollectionLockBanners";
import { RadioPlayer } from "@/components/RadioPlayer";
import type { LocationLockValue } from "@/components/LocationLockField";

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = React.useState<Collection | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [radioOpen, setRadioOpen] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState("");

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

  useCollectionActivityNotifications(collection, user?.id, setCollection);

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

  const normalizedFilter = filterQuery.trim().toLowerCase();
  const filteredItems = normalizedFilter
    ? collection.items.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedFilter) ||
          item.note.toLowerCase().includes(normalizedFilter)
      )
    : collection.items;

  const itemsWithAudio = collection.items.filter((item) => item.audioData);

  async function handleAddFromSearch(result: SearchResult) {
    // Optimistic update: show the item immediately, roll back if the request fails.
    const optimisticItem = {
      id: `optimistic-${result.id}`,
      imageUrl: result.imageUrl,
      thumbUrl: result.thumbUrl,
      sourceUrl: result.sourceUrl,
      title: result.title,
      note: "",
      audioData: null,
      audioDuration: null,
      addedBy: user,
      createdAt: new Date().toISOString(),
    };
    setCollection((prev) => (prev ? { ...prev, items: [optimisticItem, ...prev.items] } : prev));

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
      load();
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

  async function handleAttachVoice(itemId: string, audioData: string, durationSeconds: number) {
    try {
      const res = await api.post(`/collections/${id}/items/${itemId}/voice`, {
        audioData,
        audioDuration: durationSeconds,
      });
      setCollection(res.data.collection);
      toast.success("Voice note saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save voice note"));
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

  async function handleUpdateDetails(
    name: string,
    description: string,
    unlockAt: string,
    location: LocationLockValue
  ) {
    try {
      const res = await api.patch(`/collections/${id}`, {
        name,
        description,
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
        unlockLat: location.lat,
        unlockLng: location.lng,
        unlockRadiusMeters: location.radiusMeters,
      });
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
            <CollectionLockBanners collection={collection} isOwner={isOwner} canEdit={canEdit} />
          </div>

          <div className="flex flex-wrap gap-2">
            {!collection.isLocked && itemsWithAudio.length > 0 && (
              <Button onClick={() => setRadioOpen(true)}>
                <Play className="h-4 w-4" />
                Play our radio
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setSearchOpen(true)}>
                <ImagePlus className="h-4 w-4" />
                Add images
              </Button>
            )}
            {isOwner && <EditCollectionDialog collection={collection} onSave={handleUpdateDetails} />}
            {isOwner && <ShareDialog collection={collection} onUpdate={load} />}
            {isOwner && (
              <Button variant="destructive" size="icon" onClick={handleDeleteCollection}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {collection.isLocked ? (
          <div className="flex flex-col gap-6">
            {collection.lockedByTime && (
              <LockedCollectionView unlockAt={collection.unlockAt!} onUnlocked={load} />
            )}
            {collection.lockedByLocation && (
              <GeoUnlockPrompt
                collectionId={id!}
                radiusMeters={collection.unlockRadiusMeters}
                onVerified={load}
              />
            )}
          </div>
        ) : collection.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
            No images saved yet.{" "}
            {canEdit && (
              <button className="font-medium text-[var(--primary)]" onClick={() => setSearchOpen(true)}>
                Search for some
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="relative mt-4 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Filter by title or note..."
                className="pl-9"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>

            {filteredItems.length === 0 ? (
              <p className="mt-8 text-center text-[var(--muted-foreground)]">
                No saved images match "{filterQuery}".
              </p>
            ) : (
              <MasonryGrid className="mt-6">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    canEdit={canEdit}
                    onEdit={(note) => handleEditItem(item.id, note)}
                    onRemove={() => handleRemoveItem(item.id)}
                    onAttachVoice={(audioData, duration) => handleAttachVoice(item.id, audioData, duration)}
                  />
                ))}
              </MasonryGrid>
            )}
          </>
        )}
      </main>

      <ImageSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onAdd={handleAddFromSearch}
        savedImageUrls={new Set(collection.items.map((i) => i.imageUrl))}
      />

      <RadioPlayer open={radioOpen} onOpenChange={setRadioOpen} items={itemsWithAudio} />
    </div>
  );
}
