import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import {
  CollectionModel,
  isCollaborator,
  isTimeLocked,
  hasGeoLock,
  isGeoVerified,
  isLockedForViewer,
  distanceMeters,
  idOf,
  type CollectionDocument,
} from "../models/Collection";
import { UserModel } from "../models/User";
import { AppError } from "../utils/AppError";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const collectionsRouter = Router();

collectionsRouter.use(requireAuth);

const USER_POPULATE_FIELDS = "name email";
/** Sub-document/reference fields that carry a user we want the client to see by name, not raw ObjectId. */
const COLLECTION_POPULATE = [
  { path: "owner", select: USER_POPULATE_FIELDS },
  { path: "collaborators", select: USER_POPULATE_FIELDS },
  { path: "items.addedBy", select: USER_POPULATE_FIELDS },
  { path: "lastActivity.by", select: USER_POPULATE_FIELDS },
];

/** Route params can technically be string[] in Express 5's types; requests here never repeat a param name. */
function pathParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

/** Loads a collection and throws if it doesn't exist or the user can't access it. */
async function loadAccessibleCollection(
  rawId: string | string[],
  userId: string
): Promise<CollectionDocument> {
  const id = pathParam(rawId);
  if (!Types.ObjectId.isValid(id)) throw new AppError(404, "Collection not found");
  const collection = await CollectionModel.findById(id).populate(COLLECTION_POPULATE);
  if (!collection) throw new AppError(404, "Collection not found");
  if (!isCollaborator(collection, userId)) {
    throw new AppError(403, "You don't have access to this collection");
  }
  return collection;
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
}

/** After `.populate()`, these ref fields hold full user docs at runtime even though
 * their static Mongoose type is still ObjectId -- this narrows them for the API response. */
function toUserSummary(value: unknown): UserSummary | null {
  if (!value || typeof value !== "object" || !("email" in value)) return null;
  const user = value as { _id: Types.ObjectId; name: string; email: string };
  return { id: user._id.toString(), name: user.name, email: user.email };
}

/** Saves the doc and re-populates so freshly-pushed refs (new item's addedBy, etc.)
 * come back with names instead of bare ObjectIds. */
async function saveAndSerialize(collection: CollectionDocument, viewerId: string) {
  await collection.save();
  await collection.populate(COLLECTION_POPULATE);
  return serialize(collection, viewerId);
}

/** Throws if the collection is locked (by time or location) and the requester isn't the owner. */
function guardUnlocked(collection: CollectionDocument, userId: string) {
  if (isLockedForViewer(collection, userId)) {
    throw new AppError(403, "This collection is locked");
  }
}

/** Serializes for a specific viewer -- hides item contents while the
 * collection is locked (by time and/or location), unless the viewer is the owner. */
function serialize(collection: CollectionDocument, viewerId: string) {
  const isOwnerViewer = idOf(collection.owner) === viewerId;
  const lockedForViewer = isLockedForViewer(collection, viewerId);

  // A count only, never who -- revealing identities here would spoil the
  // "blind" seal even though the item contents themselves stay hidden below.
  const memberIds = new Set(
    [idOf(collection.owner), ...collection.collaborators.map((c) => idOf(c))].filter(
      (v): v is string => !!v
    )
  );
  const sealedMemberIds = new Set(
    collection.items.map((item) => idOf(item.addedBy)).filter((v): v is string => !!v)
  );

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    owner: toUserSummary(collection.owner),
    collaborators: collection.collaborators.map(toUserSummary).filter(Boolean),
    isPublic: collection.isPublic,
    shareSlug: collection.shareSlug,
    unlockAt: collection.unlockAt,
    isLocked: lockedForViewer,
    lockedByTime: !isOwnerViewer && isTimeLocked(collection),
    lockedByLocation: !isOwnerViewer && hasGeoLock(collection) && !isGeoVerified(collection, viewerId),
    hasGeoLock: hasGeoLock(collection),
    unlockRadiusMeters: collection.unlockRadiusMeters,
    // Exact target coordinates only go to the owner -- everyone else just proves
    // their own position server-side via POST /:id/verify-location.
    unlockLat: isOwnerViewer ? collection.unlockLat : null,
    unlockLng: isOwnerViewer ? collection.unlockLng : null,
    participation: { sealed: sealedMemberIds.size, total: memberIds.size },
    // Hidden while locked too -- it would otherwise spoil what's inside before the reveal.
    lastActivity:
      !lockedForViewer && collection.lastActivity?.at
        ? { by: toUserSummary(collection.lastActivity.by), action: collection.lastActivity.action, at: collection.lastActivity.at }
        : undefined,
    items: lockedForViewer
      ? []
      : collection.items.map((item) => ({
          id: item._id.toString(),
          imageUrl: item.imageUrl,
          thumbUrl: item.thumbUrl,
          sourceUrl: item.sourceUrl,
          title: item.title,
          note: item.note,
          audioData: item.audioData,
          audioDuration: item.audioDuration,
          addedBy: toUserSummary(item.addedBy),
          createdAt: (item as unknown as { createdAt: Date }).createdAt,
        })),
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

/**
 * GET /api/collections -- requires auth.
 * Returns { collections } the current user owns or collaborates on.
 */
collectionsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const collections = await CollectionModel.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    })
      .sort({ updatedAt: -1 })
      .populate(COLLECTION_POPULATE);
    res.json({ collections: collections.map((c) => serialize(c, req.userId!)) });
  } catch (err) {
    next(err);
  }
});

/** Either all three geo-lock fields are provided together, or none are. */
function geoLockFieldsAreConsistent(data: {
  unlockLat?: number | null;
  unlockLng?: number | null;
  unlockRadiusMeters?: number | null;
}) {
  const provided = [data.unlockLat, data.unlockLng, data.unlockRadiusMeters].filter(
    (v) => v !== undefined && v !== null
  );
  return provided.length === 0 || provided.length === 3;
}

const createCollectionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    description: z.string().trim().max(500).optional(),
    unlockAt: z.coerce.date().optional(),
    unlockLat: z.number().min(-90).max(90).optional(),
    unlockLng: z.number().min(-180).max(180).optional(),
    unlockRadiusMeters: z.number().positive().optional(),
  })
  .refine(geoLockFieldsAreConsistent, { message: "Provide lat, lng, and radius together" });

/**
 * POST /api/collections -- requires auth.
 * Body: { name, description?, unlockAt?, unlockLat?, unlockLng?, unlockRadiusMeters? }.
 * Creates a collection owned by the current user. If unlockAt is a future date
 * and/or a location is set, the collection starts locked for everyone but the owner.
 */
collectionsRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { name, description, unlockAt, unlockLat, unlockLng, unlockRadiusMeters } =
      createCollectionSchema.parse(req.body);
    const collection = await CollectionModel.create({
      name,
      description: description ?? "",
      owner: req.userId,
      collaborators: [],
      items: [],
      unlockAt: unlockAt ?? null,
      unlockLat: unlockLat ?? null,
      unlockLng: unlockLng ?? null,
      unlockRadiusMeters: unlockRadiusMeters ?? null,
    });
    await collection.populate(COLLECTION_POPULATE);
    res.status(201).json({ collection: serialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/collections/:id -- requires auth + owner/collaborator access.
 * Returns a single collection with its items.
 */
collectionsRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    res.json({ collection: serialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

const updateCollectionSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().max(500).optional(),
    isPublic: z.boolean().optional(),
    unlockAt: z.coerce.date().nullable().optional(),
    unlockLat: z.number().min(-90).max(90).nullable().optional(),
    unlockLng: z.number().min(-180).max(180).nullable().optional(),
    unlockRadiusMeters: z.number().positive().nullable().optional(),
  })
  .refine(geoLockFieldsAreConsistent, { message: "Provide lat, lng, and radius together" });

/**
 * PATCH /api/collections/:id -- requires auth + ownership.
 * Body: { name?, description?, isPublic?, unlockAt?, unlockLat?, unlockLng?, unlockRadiusMeters? }.
 * Updates collection settings, including the public/private share toggle and
 * the time-lock/location-lock (pass unlockAt/unlockLat/unlockLng/unlockRadiusMeters
 * as null to clear the corresponding lock).
 */
collectionsRouter.patch("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    if (idOf(collection.owner) !== req.userId) {
      throw new AppError(403, "Only the owner can edit collection settings");
    }
    const updates = updateCollectionSchema.parse(req.body);
    Object.assign(collection, updates);
    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

const verifyLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * POST /api/collections/:id/verify-location -- requires auth + owner/collaborator access.
 * Body: { lat, lng } from the browser's Geolocation API.
 * If within unlockRadiusMeters of the collection's target point, marks this
 * user as geo-verified (persists) and returns the now-unlocked collection.
 * Otherwise 403s with how far off they were.
 */
collectionsRouter.post("/:id/verify-location", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    if (!hasGeoLock(collection)) {
      throw new AppError(400, "This collection doesn't have a location lock");
    }

    const { lat, lng } = verifyLocationSchema.parse(req.body);
    const distance = distanceMeters(lat, lng, collection.unlockLat!, collection.unlockLng!);

    if (distance > collection.unlockRadiusMeters!) {
      throw new AppError(
        403,
        `You're about ${Math.round(distance)}m away -- you need to be within ${collection.unlockRadiusMeters}m`
      );
    }

    if (!isGeoVerified(collection, req.userId!)) {
      collection.geoVerifiedUsers.push(new Types.ObjectId(req.userId));
    }
    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/collections/:id -- requires auth + ownership.
 * Deletes the collection and all of its items.
 */
collectionsRouter.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    if (idOf(collection.owner) !== req.userId) {
      throw new AppError(403, "Only the owner can delete this collection");
    }
    await collection.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- Items ---

const addItemSchema = z.object({
  imageUrl: z.string().url(),
  thumbUrl: z.string().url(),
  sourceUrl: z.string().url().optional(),
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/collections/:id/items -- requires auth + owner/collaborator access.
 * Body: { imageUrl, thumbUrl, sourceUrl?, title?, note? }.
 * Saves an image into the collection. Allowed even while time-locked -- this
 * is the "blind upload": collaborators can contribute, but the item list
 * (including their own upload) stays hidden from them until it unlocks.
 */
collectionsRouter.post("/:id/items", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const data = addItemSchema.parse(req.body);

    collection.items.push({ ...data, addedBy: new Types.ObjectId(req.userId) });
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "added an image", at: new Date() };

    res.status(201).json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

const attachVoiceSchema = z.object({
  audioData: z.string().min(1).max(2_000_000), // base64 data URL, ~2MB cap
  audioDuration: z.number().positive().max(60),
});

/**
 * POST /api/collections/:id/items/:itemId/voice -- requires auth + owner/collaborator access.
 * Body: { audioData, audioDuration }.
 * Attaches a voice memo to an item. Allowed even while time-locked, same as
 * adding items -- part of the "blind" seal, not an edit to a sealed item.
 */
collectionsRouter.post("/:id/items/:itemId/voice", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const item = collection.items.id(pathParam(req.params.itemId));
    if (!item) throw new AppError(404, "Item not found");

    const { audioData, audioDuration } = attachVoiceSchema.parse(req.body);
    item.audioData = audioData;
    item.audioDuration = audioDuration;
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "recorded a voice note", at: new Date() };

    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

const editItemSchema = z.object({
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

/**
 * PATCH /api/collections/:id/items/:itemId -- requires auth + owner/collaborator access.
 * Body: { title?, note? }.
 * Edits a saved item's caption/note.
 */
collectionsRouter.patch("/:id/items/:itemId", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    guardUnlocked(collection, req.userId!);
    const item = collection.items.id(pathParam(req.params.itemId));
    if (!item) throw new AppError(404, "Item not found");

    const updates = editItemSchema.parse(req.body);
    Object.assign(item, updates);
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "edited an image", at: new Date() };

    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/collections/:id/items/:itemId -- requires auth + owner/collaborator access.
 * Removes an item from the collection.
 */
collectionsRouter.delete("/:id/items/:itemId", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    guardUnlocked(collection, req.userId!);
    const item = collection.items.id(pathParam(req.params.itemId));
    if (!item) throw new AppError(404, "Item not found");

    item.deleteOne();
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "removed an image", at: new Date() };

    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

// --- Collaborators ---

const inviteSchema = z.object({
  email: z.string().trim().email(),
});

/**
 * POST /api/collections/:id/collaborators -- requires auth + ownership.
 * Body: { email }.
 * Invites an existing account (by email) to collaborate on the collection.
 */
collectionsRouter.post("/:id/collaborators", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    if (idOf(collection.owner) !== req.userId) {
      throw new AppError(403, "Only the owner can invite collaborators");
    }

    const { email } = inviteSchema.parse(req.body);
    const user = await UserModel.findOne({ email });
    if (!user) throw new AppError(404, "No account found with that email");
    if (user.id === idOf(collection.owner)) {
      throw new AppError(400, "You already own this collection");
    }
    if (isCollaborator(collection, user.id)) {
      throw new AppError(409, "That user is already a collaborator");
    }

    collection.collaborators.push(user._id);
    res.status(201).json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/collections/:id/collaborators/:userId -- requires auth.
 * The owner can remove any collaborator; a collaborator can remove themselves.
 */
collectionsRouter.delete("/:id/collaborators/:userId", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const isOwner = idOf(collection.owner) === req.userId;
    const targetUserId = pathParam(req.params.userId);
    const isSelf = targetUserId === req.userId;
    if (!isOwner && !isSelf) {
      throw new AppError(403, "Only the owner can remove other collaborators");
    }

    collection.collaborators = collection.collaborators.filter(
      (c) => idOf(c) !== targetUserId
    ) as typeof collection.collaborators;
    res.json({ collection: await saveAndSerialize(collection, req.userId!) });
  } catch (err) {
    next(err);
  }
});
