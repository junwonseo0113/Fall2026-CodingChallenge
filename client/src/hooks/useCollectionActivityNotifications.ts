import * as React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Collection } from "@/lib/types";

const POLL_INTERVAL_MS = 8000;

/**
 * Polls a collection in the background while it's open and toasts when a
 * collaborator adds, edits, or removes something -- so shared boards feel
 * live instead of requiring a manual refresh to see teammates' changes.
 */
export function useCollectionActivityNotifications(
  collection: Collection | null,
  currentUserId: string | undefined,
  onRefresh: (fresh: Collection) => void
) {
  const lastSeenAtRef = React.useRef<string | undefined>(collection?.lastActivity?.at);

  // Whenever the displayed collection changes (our own edit, or a previous poll),
  // treat its activity as already "seen" so we don't re-notify for it.
  React.useEffect(() => {
    lastSeenAtRef.current = collection?.lastActivity?.at;
  }, [collection?.lastActivity?.at]);

  React.useEffect(() => {
    if (!collection?.id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/collections/${collection.id}`);
        const fresh: Collection = res.data.collection;
        const activity = fresh.lastActivity;

        const isNew = activity?.at && activity.at !== lastSeenAtRef.current;
        const isFromSomeoneElse = activity?.by && activity.by.id !== currentUserId;
        if (isNew && isFromSomeoneElse) {
          toast.info(`${activity!.by!.name} ${activity!.action}`);
        }

        onRefresh(fresh);
      } catch {
        // Background poll -- fail silently and let the next tick retry.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [collection?.id, currentUserId, onRefresh]);
}
