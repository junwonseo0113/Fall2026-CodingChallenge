import { Router } from "express";
import { CollectionModel, isTimeLocked, hasGeoLock } from "../models/Collection";
import { AppError } from "../utils/AppError";

export const publicRouter = Router();

/**
 * GET /api/public/:slug -- public, no auth required.
 * Read-only view of a collection via its share link; 404s unless the
 * collection has been toggled to "public" by its owner. While locked,
 * items are hidden and only { isLocked, unlockAt } are returned.
 * Note: a location-lock can't be *verified* here -- geo verification is
 * tied to a logged-in account, which anonymous public viewers don't have --
 * so a geo-locked collection just stays permanently locked on the public
 * link rather than silently skipping that check.
 */
publicRouter.get("/:slug", async (req, res, next) => {
  try {
    const collection = await CollectionModel.findOne({ shareSlug: req.params.slug });
    if (!collection || !collection.isPublic) {
      throw new AppError(404, "This collection is not available");
    }

    const locked = isTimeLocked(collection) || hasGeoLock(collection);

    res.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        isLocked: locked,
        unlockAt: collection.unlockAt,
        items: locked
          ? []
          : collection.items.map((item) => ({
              id: item._id.toString(),
              imageUrl: item.imageUrl,
              thumbUrl: item.thumbUrl,
              sourceUrl: item.sourceUrl,
              title: item.title,
              note: item.note,
            })),
      },
    });
  } catch (err) {
    next(err);
  }
});
