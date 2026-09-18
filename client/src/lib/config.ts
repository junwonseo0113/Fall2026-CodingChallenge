import { api } from "./api";

let cached: Promise<boolean> | null = null;

/**
 * Whether the server has a real Unsplash key configured. Lets features that
 * depend on Unsplash (image search, "today's visual") skip their request
 * entirely and degrade gracefully instead of firing a request that's
 * guaranteed to fail. Cached after the first check since this never
 * changes without a server restart.
 */
export function unsplashConfigured(): Promise<boolean> {
  if (!cached) {
    cached = api
      .get("/health")
      .then((res) => Boolean(res.data.unsplashConfigured))
      .catch(() => false);
  }
  return cached;
}
