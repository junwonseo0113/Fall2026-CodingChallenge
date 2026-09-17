import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LocationLockField, type LocationLockValue } from "@/components/LocationLockField";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY_LOCATION: LocationLockValue = { lat: null, lng: null, radiusMeters: null };

export function CreateCollectionDialog({
  onCreate,
}: {
  onCreate: (name: string, description: string, unlockAt: string, location: LocationLockValue) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [unlockAt, setUnlockAt] = React.useState("");
  const [location, setLocation] = React.useState<LocationLockValue>(EMPTY_LOCATION);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate(name, description, unlockAt, location);
      setName("");
      setDescription("");
      setUnlockAt("");
      setLocation(EMPTY_LOCATION);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="collection-name">Name</Label>
            <Input
              id="collection-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend recipes"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collection-description">Description (optional)</Label>
            <Textarea
              id="collection-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board about?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="collection-unlock">Time-lock until (optional)</Label>
            <Input
              id="collection-unlock"
              type="datetime-local"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Others can add photos blindly until then, but only you can see what's inside.
            </p>
          </div>
          <LocationLockField value={location} onChange={setLocation} />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create collection"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
