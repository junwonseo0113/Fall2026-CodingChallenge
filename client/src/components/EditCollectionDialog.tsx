import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Collection } from "@/lib/types";

/** Converts an ISO date to the value a <input type="datetime-local"> expects (local time, no seconds/zone). */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function EditCollectionDialog({
  collection,
  onSave,
}: {
  collection: Collection;
  onSave: (name: string, description: string, unlockAt: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(collection.name);
  const [description, setDescription] = React.useState(collection.description);
  const [unlockAt, setUnlockAt] = React.useState(toDatetimeLocal(collection.unlockAt));
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(name, description, unlockAt);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(collection.name);
          setDescription(collection.description);
          setUnlockAt(toDatetimeLocal(collection.unlockAt));
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-unlock">Time-lock until</Label>
            <div className="flex gap-2">
              <Input
                id="edit-unlock"
                type="datetime-local"
                value={unlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
              />
              {unlockAt && (
                <Button type="button" variant="outline" onClick={() => setUnlockAt("")}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Until this date, only you can see what's in this collection.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
