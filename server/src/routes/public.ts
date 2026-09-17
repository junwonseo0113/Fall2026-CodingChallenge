import { Router } from "express";
import { CollectionModel } from "../models/Collection";
import { AppError } from "../utils/AppError";

export const publicRouter = Router();

// Read-only view of a collection via its share link. No auth required,
// but the collection must have been toggled to "public" by its owner.
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
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
