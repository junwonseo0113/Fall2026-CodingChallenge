import * as React from "react";
import { Copy, Share2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShareDialog({
  collection,
  onUpdate,
}: {
  collection: Collection;
  onUpdate: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [inviting, setInviting] = React.useState(false);
  const shareUrl = `${window.location.origin}/shared/${collection.shareSlug}`;

  async function togglePublic(checked: boolean) {
    try {
      await api.patch(`/collections/${collection.id}`, { isPublic: checked });
      onUpdate();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update sharing settings"));
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post(`/collections/${collection.id}/collaborators`, { email });
      toast.success(`Invited ${email}`);
      setEmail("");
      onUpdate();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to invite collaborator"));
    } finally {
      setInviting(false);
    }
  }

  async function removeCollaborator(userId: string) {
    try {
      await api.delete(`/collections/${collection.id}/collaborators/${userId}`);
      onUpdate();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to remove collaborator"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{collection.name}"</DialogTitle>
          <DialogDescription>Invite people to collaborate or make it public.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3">
            <div>
              <p className="text-sm font-medium">Public link</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Anyone with the link can view this collection
              </p>
            </div>
            <Switch checked={collection.isPublic} onCheckedChange={togglePublic} />
          </div>

          {collection.isPublic && (
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} />
              <Button variant="outline" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor="invite-email">Invite a collaborator</Label>
            <form onSubmit={invite} className="mt-1.5 flex gap-2">
              <Input
                id="invite-email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={inviting}>
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </form>
          </div>

          {collection.collaborators.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Collaborators</p>
              <ul className="space-y-1.5">
                {collection.collaborators.map((collaborator) => (
                  <li
                    key={collaborator.id}
                    className="flex items-center justify-between rounded-lg bg-[var(--muted)] px-3 py-2 text-sm"
                  >
                    <span className="truncate">
                      {collaborator.name} <span className="text-[var(--muted-foreground)]">({collaborator.email})</span>
                    </span>
                    <button
                      onClick={() => removeCollaborator(collaborator.id)}
                      className="text-[var(--muted-foreground)] hover:text-red-600"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
