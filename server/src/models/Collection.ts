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
    // Unsplash attribution, required by their API guidelines. Empty for
    // items added via a plain pasted URL that isn't an Unsplash photo.
    credit: { type: String, default: "" },
    creditUrl: { type: String, default: "" },
    // Quick self-organization chips, e.g. "wallpaper", "reference", "profile".
    tags: { type: [String], default: [] },
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
