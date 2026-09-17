import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { CollectionModel, isCollaborator, idOf, type CollectionDocument } from "../models/Collection";
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
async function saveAndSerialize(collection: CollectionDocument) {
  await collection.save();
  await collection.populate(COLLECTION_POPULATE);
  return serialize(collection);
}

function serialize(collection: CollectionDocument) {
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    owner: toUserSummary(collection.owner),
    collaborators: collection.collaborators.map(toUserSummary).filter(Boolean),
    isPublic: collection.isPublic,
    shareSlug: collection.shareSlug,
    lastActivity: collection.lastActivity?.at
      ? { by: toUserSummary(collection.lastActivity.by), action: collection.lastActivity.action, at: collection.lastActivity.at }
      : undefined,
    items: collection.items.map((item) => ({
      id: item._id.toString(),
      imageUrl: item.imageUrl,
      thumbUrl: item.thumbUrl,
      sourceUrl: item.sourceUrl,
      title: item.title,
      note: item.note,
      addedBy: toUserSummary(item.addedBy),
      createdAt: (item as unknown as { createdAt: Date }).createdAt,
    })),
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  };
}

// List all collections the current user owns or collaborates on.
collectionsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const collections = await CollectionModel.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    })
      .sort({ updatedAt: -1 })
      .populate(COLLECTION_POPULATE);
    res.json({ collections: collections.map(serialize) });
  } catch (err) {
    next(err);
  }
});

const createCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500).optional(),
});

collectionsRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { name, description } = createCollectionSchema.parse(req.body);
    const collection = await CollectionModel.create({
      name,
      description: description ?? "",
      owner: req.userId,
      collaborators: [],
      items: [],
    });
    await collection.populate(COLLECTION_POPULATE);
    res.status(201).json({ collection: serialize(collection) });
  } catch (err) {
    next(err);
  }
});

collectionsRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    res.json({ collection: serialize(collection) });
  } catch (err) {
    next(err);
  }
});

const updateCollectionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

collectionsRouter.patch("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    if (idOf(collection.owner) !== req.userId) {
      throw new AppError(403, "Only the owner can edit collection settings");
    }
    const updates = updateCollectionSchema.parse(req.body);
    Object.assign(collection, updates);
    res.json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});

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

collectionsRouter.post("/:id/items", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const data = addItemSchema.parse(req.body);

    collection.items.push({ ...data, addedBy: new Types.ObjectId(req.userId) });
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "added an image", at: new Date() };

    res.status(201).json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});

const editItemSchema = z.object({
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

collectionsRouter.patch("/:id/items/:itemId", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const item = collection.items.id(pathParam(req.params.itemId));
    if (!item) throw new AppError(404, "Item not found");

    const updates = editItemSchema.parse(req.body);
    Object.assign(item, updates);
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "edited an image", at: new Date() };

    res.json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});

collectionsRouter.delete("/:id/items/:itemId", async (req: AuthedRequest, res, next) => {
  try {
    const collection = await loadAccessibleCollection(req.params.id, req.userId!);
    const item = collection.items.id(pathParam(req.params.itemId));
    if (!item) throw new AppError(404, "Item not found");

    item.deleteOne();
    collection.lastActivity = { by: new Types.ObjectId(req.userId), action: "removed an image", at: new Date() };

    res.json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});

// --- Collaborators ---

const inviteSchema = z.object({
  email: z.string().trim().email(),
});

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
    res.status(201).json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});

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
    res.json({ collection: await saveAndSerialize(collection) });
  } catch (err) {
    next(err);
  }
});
