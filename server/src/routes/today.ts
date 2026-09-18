import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { requireAuth } from "../middleware/auth";
import { toSearchResult, type UnsplashPhoto } from "../utils/unsplash";
import { fetchWeather, buildTodayVisualContext } from "../utils/weather";
import { createTtlCache } from "../utils/ttlCache";

export const todayRouter = Router();

todayRouter.use(requireAuth);

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  // The requester's own local hour (0-23) from `new Date().getHours()` --
  // using the server's clock would pick the wrong time-of-day bucket for
  // anyone outside its timezone.
  hour: z.coerce.number().int().min(0).max(23).optional(),
});

// Many dashboard loads can share the same time/weather bucket -- cache by
// query for a few minutes so they don't each burn a separate Unsplash
// request against the free tier's rate limit.
const todayCache = createTtlCache<ReturnType<typeof toSearchResult> | null>(10 * 60 * 1000);

/** Picks a stable-for-the-day (not random-per-request) photo from the top results for a query. */
async function fetchTodayPhoto(query: string): Promise<ReturnType<typeof toSearchResult> | null> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "10");

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
  });
  if (!response.ok) throw new AppError(response.status, "Couldn't fetch today's visual");

  const data = (await response.json()) as { results: UnsplashPhoto[] };
  if (data.results.length === 0) return null;

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  return toSearchResult(data.results[dayOfYear % data.results.length]);
}

/**
 * GET /api/today-visual?lat=&lon=&hour= -- requires auth.
 * Picks one Unsplash photo matched to the requester's local time of day and
 * (if lat/lon are given) current weather at that location, e.g. a rainy
 * evening near the user surfaces a "rain sunset golden hour" pick. Weather
 * comes from Open-Meteo, which needs no API key. Stable for the day (not
 * re-randomized on every reload) and cached briefly to save Unsplash quota.
 */
todayRouter.get("/", async (req, res, next) => {
  try {
    if (!env.unsplashAccessKey) {
      throw new AppError(
        500,
        "Set a real UNSPLASH_ACCESS_KEY in server/.env (get one free at unsplash.com/oauth/applications)"
      );
    }

    const { lat, lon, hour } = querySchema.parse(req.query);
    const effectiveHour = hour ?? new Date().getHours();
    const weather = lat !== undefined && lon !== undefined ? await fetchWeather(lat, lon) : null;
    const context = buildTodayVisualContext(effectiveHour, weather);

    let result = todayCache.get(context.query);
    if (result === undefined) {
      result = await fetchTodayPhoto(context.query);
      todayCache.set(context.query, result);
    }

    res.json({ keyword: context.query, summary: context.summary, result });
  } catch (err) {
    next(err);
  }
});
