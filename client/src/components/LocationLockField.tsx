import * as React from "react";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentPosition } from "@/lib/geolocation";

export interface LocationLockValue {
  lat: number | null;
  lng: number | null;
  radiusMeters: number | null;
}

/** Lets the owner set (or clear) a required unlock location using the browser's Geolocation API. */
export function LocationLockField({
  value,
  onChange,
}: {
  value: LocationLockValue;
  onChange: (value: LocationLockValue) => void;
}) {
  const [locating, setLocating] = React.useState(false);
  const hasLocation = value.lat != null && value.lng != null;

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      onChange({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radiusMeters: value.radiusMeters ?? 200,
      });
      toast.success("Location captured");
    } catch {
      toast.error("Couldn't get your location -- check browser permissions");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>Require unlocking at a location (optional)</Label>
      {hasLocation ? (
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <MapPin className="h-3.5 w-3.5" />
            {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={() => onChange({ lat: null, lng: null, radiusMeters: null })}
            className="text-[var(--muted-foreground)] hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" disabled={locating} onClick={useCurrentLocation}>
          <MapPin className="h-3.5 w-3.5" />
          {locating ? "Locating..." : "Use my current location"}
        </Button>
      )}
      {hasLocation && (
        <div className="flex items-center gap-2">
          <Label htmlFor="unlock-radius" className="text-xs font-normal text-[var(--muted-foreground)]">
            Radius (meters)
          </Label>
          <Input
            id="unlock-radius"
            type="number"
            min={1}
            className="h-8 w-24"
            value={value.radiusMeters ?? ""}
            onChange={(e) => onChange({ ...value, radiusMeters: Number(e.target.value) || null })}
          />
        </div>
      )}
      <p className="text-xs text-[var(--muted-foreground)]">
        Others must be within this radius (proven via their browser's location) to unlock.
      </p>
    </div>
  );
}
