import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { requireAuth } from "../middleware/auth";

export const searchRouter = Router();

searchRouter.use(requireAuth);

const querySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  page: z.coerce.number().int().min(1).default(1),
});

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { regular: string; small: string };
  links: { html: string };
  user: { name: string };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total_pages: number;
}

/**
 * GET /api/search?q=&page= -- requires auth.
 * Proxies image search to Unsplash so the API key never reaches the browser.
 * Returns { results, totalPages }.
 */
searchRouter.get("/", async (req, res, next) => {
  try {
    if (!env.unsplashAccessKey) {
      throw new AppError(500, "Server is missing UNSPLASH_ACCESS_KEY");
    }

    const { q, page } = querySchema.parse(req.query);

    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", q);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "20");

    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
    });

    if (!response.ok) {
      throw new AppError(response.status, "Image search failed");
    }

    const data = (await response.json()) as UnsplashSearchResponse;

    res.json({
      totalPages: data.total_pages,
      results: data.results.map((photo) => ({
        id: photo.id,
        title: photo.description ?? photo.alt_description ?? "",
        imageUrl: photo.urls.regular,
        thumbUrl: photo.urls.small,
        sourceUrl: photo.links.html,
        credit: photo.user.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});
