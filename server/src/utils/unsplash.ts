import { env } from "../config/env";

/**
 * Unsplash's API guidelines require pinging a photo's `download_location`
 * URL once when a user actually uses/saves it (not just previews it in
 * search) so it counts toward the photographer's download stats. Best-effort
 * only -- a failure here shouldn't block or fail the item save itself.
 */
export async function pingUnsplashDownload(downloadLocation: string): Promise<void> {
  if (!env.unsplashAccessKey) return;
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${env.unsplashAccessKey}` },
    });
  } catch {
    // Ignore -- this is a tracking ping, not a user-facing operation.
  }
}
