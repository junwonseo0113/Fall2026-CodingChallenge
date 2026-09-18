import { Link } from "react-router-dom";
import { Globe, Lock, Users } from "lucide-react";
import type { Collection } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function CollectionCard({ collection, isOwner }: { collection: Collection; isOwner: boolean }) {
  const covers = collection.items.slice(0, 3);

  return (
    <Link to={`/collections/${collection.id}`}>
      <Card className="group overflow-hidden transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
        <div className="grid h-40 grid-cols-3 gap-0.5 bg-[var(--muted)]">
          {covers.length === 0 ? (
            <div className="col-span-3 flex items-center justify-center text-sm text-[var(--muted-foreground)]">
              No images yet
            </div>
          ) : (
            <>
              <div className="col-span-2 row-span-1 overflow-hidden">
                <img
                  src={covers[0].thumbUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col gap-0.5">
                {covers.slice(1, 3).map((item) => (
                  <div key={item.id} className="h-full w-full overflow-hidden">
                    <img src={item.thumbUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-medium">{collection.name}</h3>
            <div className="flex shrink-0 items-center gap-1.5">
              {collection.isPublic ? (
                <Globe className="h-4 w-4 text-[var(--muted-foreground)]" />
              ) : (
                <Lock className="h-4 w-4 text-[var(--muted-foreground)]" />
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span>{collection.items.length} items</span>
            {!isOwner && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> Shared with you
              </span>
            )}
            {isOwner && collection.collaborators.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {collection.collaborators.length} collaborator
                {collection.collaborators.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
