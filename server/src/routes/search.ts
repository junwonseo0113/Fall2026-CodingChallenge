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
  urls: { raw: string; full: string; regular: string; small: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total_pages: number;
}

/** Grid thumbnails only need to be small and can be more aggressively compressed. */
function thumbSizeOf(rawUrl: string): string {
  return `${rawUrl}&w=400&q=70&fit=crop&auto=format`;
}

/** Only fetched/rendered at full size once an item is actually saved, not for every grid tile. */
function saveSizeOf(rawUrl: string): string {
  return `${rawUrl}&w=2000&q=80&auto=format`;
}

interface CacheEntry {
  expiresAt: number;
  payload: { totalPages: number; results: unknown[] };
}

// Unsplash's free tier allows only 50 requests/hour -- caching identical
// searches for a few minutes absorbs repeat/typo-retry queries without
// ever risking a stale result (5 min is short enough that new photos
// still show up promptly).
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, CacheEntry>();

function cacheKey(q: string, page: number): string {
  return `${q.toLowerCase()}::${page}`;
}

/**
 * GET /api/search?q=&page= -- requires auth.
 * Proxies image search to Unsplash so the API key never reaches the browser.
 * Returns { results, totalPages }. Thumbnails are requested at a small,
 * compressed size for fast grid loading; each result's imageUrl (used only
 * once an image is actually saved) is a larger, higher-quality render.
 */
searchRouter.get("/", async (req, res, next) => {
  try {
    if (!env.unsplashAccessKey) {
      throw new AppError(
        500,
        "Set a real UNSPLASH_ACCESS_KEY in server/.env (get one free at unsplash.com/oauth/applications)"
      );
    }

    const { q, page } = querySchema.parse(req.query);

    const key = cacheKey(q, page);
    const cached = searchCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      res.json(cached.payload);
      return;
    }

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

    const payload = {
      totalPages: data.total_pages,
      results: data.results.map((photo) => ({
        id: photo.id,
        title: photo.description ?? photo.alt_description ?? "",
        imageUrl: saveSizeOf(photo.urls.raw),
        thumbUrl: thumbSizeOf(photo.urls.raw),
        sourceUrl: photo.links.html,
        credit: photo.user.name,
        creditUrl: photo.user.links.html,
        downloadLocation: photo.links.download_location,
      })),
    };

    searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, payload });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});
