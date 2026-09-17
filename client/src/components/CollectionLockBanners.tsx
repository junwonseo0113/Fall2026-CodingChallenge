import { MapPin, Timer } from "lucide-react";
import type { Collection } from "@/lib/types";

/** The small status lines under a collection's title explaining its lock state to the owner/editors. */
export function CollectionLockBanners({
  collection,
  isOwner,
  canEdit,
}: {
  collection: Collection;
  isOwner: boolean;
  canEdit: boolean;
}) {
  const ownerLockActive = isOwner && !!collection.unlockAt && new Date(collection.unlockAt) > new Date();

  return (
    <>
      {ownerLockActive && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
          <Timer className="h-3.5 w-3.5" />
          Locked until {new Date(collection.unlockAt!).toLocaleString()} -- only you can see this until then
        </p>
      )}
      {collection.isLocked && canEdit && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
          <Timer className="h-3.5 w-3.5" />
          Locked -- you can still add photos blindly, but won't see what's inside until it unlocks
        </p>
      )}
      {isOwner && collection.hasGeoLock && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
          <MapPin className="h-3.5 w-3.5" />
          Requires unlocking within {collection.unlockRadiusMeters}m of the target location
        </p>
      )}
    </>
  );
}
