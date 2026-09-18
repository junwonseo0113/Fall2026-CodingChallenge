import { Router } from "express";
import { CollectionModel } from "../models/Collection";
import { AppError } from "../utils/AppError";

export const publicRouter = Router();

/**
 * GET /api/public/:slug -- public, no auth required.
 * Read-only view of a collection via its share link; 404s unless the
 * collection has been toggled to "public" by its owner.
 */
publicRouter.get("/:slug", async (req, res, next) => {
  try {
    const collection = await CollectionModel.findOne({ shareSlug: req.params.slug });
    if (!collection || !collection.isPublic) {
      throw new AppError(404, "This collection is not available");
    }

    res.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        items: collection.items.map((item) => ({
          id: item._id.toString(),
          imageUrl: item.imageUrl,
          thumbUrl: item.thumbUrl,
          sourceUrl: item.sourceUrl,
          title: item.title,
          note: item.note,
          credit: item.credit,
          creditUrl: item.creditUrl,
          tags: item.tags,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
