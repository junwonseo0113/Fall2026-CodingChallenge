import { Schema, model, Types, type InferSchemaType, type HydratedDocument } from "mongoose";
import crypto from "crypto";

const itemSchema = new Schema(
  {
    imageUrl: { type: String, required: true },
    thumbUrl: { type: String, required: true },
    sourceUrl: { type: String }, // link back to the original page (e.g. Unsplash)
    title: { type: String, default: "" },
    note: { type: String, default: "" }, // user-editable caption/note
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // A short voice memo attached to this item, stored as a base64 data URL
    // (e.g. "data:audio/webm;base64,..."). Optional -- most items won't have one.
    audioData: { type: String, default: null },
    audioDuration: { type: Number, default: null }, // seconds
  },
  { timestamps: true }
);

const collectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }],
    items: [itemSchema],
    isPublic: { type: Boolean, default: false },
    shareSlug: {
      type: String,
      default: () => crypto.randomBytes(6).toString("hex"),
      unique: true,
    },
    lastActivity: {
      by: { type: Schema.Types.ObjectId, ref: "User" },
      action: { type: String },
      at: { type: Date },
    },
    // Time-lock: while set and in the future, only the owner can see the
    // collection's contents -- everyone else gets a countdown instead.
    unlockAt: { type: Date, default: null },
    // Location-lock: while set, a viewer must prove (via the browser's
    // Geolocation API) they're within unlockRadiusMeters of this point
    // before they can see the collection's contents.
    unlockLat: { type: Number, default: null },
    unlockLng: { type: Number, default: null },
    unlockRadiusMeters: { type: Number, default: null },
    geoVerifiedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export type CollectionItem = InferSchemaType<typeof itemSchema>;
export type Collection = InferSchemaType<typeof collectionSchema>;
export type CollectionDocument = HydratedDocument<Collection>;

/** Extracts a plain string id whether the ref is a raw ObjectId or a `.populate()`d document. */
export function idOf(value: Types.ObjectId | { _id: Types.ObjectId } | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Types.ObjectId) return value.toString();
  return value._id.toString();
}

/** True while the collection's time-lock hasn't reached its unlock date yet. */
export function isTimeLocked(collection: Pick<Collection, "unlockAt">): boolean {
  return !!collection.unlockAt && collection.unlockAt.getTime() > Date.now();
}

export function hasGeoLock(
  collection: Pick<Collection, "unlockLat" | "unlockLng" | "unlockRadiusMeters">
): boolean {
  return (
    collection.unlockLat != null && collection.unlockLng != null && collection.unlockRadiusMeters != null
  );
}

export function isGeoVerified(
  collection: Pick<Collection, "geoVerifiedUsers">,
  userId: string
): boolean {
  return collection.geoVerifiedUsers.some((u) => idOf(u) === userId);
}

/** True if the viewer hasn't satisfied every lock (time and/or location) that applies. */
export function isLockedForViewer(
  collection: Pick<Collection, "owner" | "unlockAt" | "unlockLat" | "unlockLng" | "unlockRadiusMeters" | "geoVerifiedUsers">,
  viewerId: string
): boolean {
  if (idOf(collection.owner) === viewerId) return false;
  return isTimeLocked(collection) || (hasGeoLock(collection) && !isGeoVerified(collection, viewerId));
}

/** Great-circle distance between two lat/lng points, in meters. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function isCollaborator(
  collection: Pick<Collection, "owner" | "collaborators">,
  userId: Types.ObjectId | string
): boolean {
  const id = userId.toString();
  return (
    idOf(collection.owner) === id || collection.collaborators.some((c) => idOf(c) === id)
  );
}

export const CollectionModel = model("Collection", collectionSchema);
