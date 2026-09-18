import * as React from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geolocation";
import { Button } from "@/components/ui/button";
import { ParticipationBadge } from "@/components/ParticipationBadge";

export function GeoUnlockPrompt({
  collectionId,
  radiusMeters,
  participation,
  onVerified,
}: {
  collectionId: string;
  radiusMeters: number | null;
  participation: { sealed: number; total: number };
  onVerified: () => void;
}) {
  const [verifying, setVerifying] = React.useState(false);

  async function verify() {
    setVerifying(true);

    let position: GeolocationPosition;
    try {
      position = await getCurrentPosition();
    } catch {
      toast.error("Couldn't get your location -- check browser permissions");
      setVerifying(false);
      return;
    }

    try {
      await api.post(`/collections/${collectionId}/verify-location`, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      toast.success("Location verified!");
      onVerified();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to verify location"));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
      <MapPin className="h-8 w-8 text-[var(--muted-foreground)]" />
      <div>
        <h3 className="font-semibold">This collection unlocks at a specific location</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {radiusMeters
            ? `You need to be within ${radiusMeters}m of the target spot.`
            : "Prove your location to unlock."}
        </p>
      </div>
      <ParticipationBadge sealed={participation.sealed} total={participation.total} />
      <Button onClick={verify} disabled={verifying}>
        {verifying ? "Checking..." : "Verify my location"}
      </Button>
    </div>
  );
}
