import { env } from "../config/env";

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  color: string | null; // Unsplash's own dominant-color swatch for the photo, e.g. "#E0E0E0"
  urls: { raw: string; full: string; regular: string; small: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
}

/** Grid thumbnails only need to be small and can be more aggressively compressed. */
export function thumbSizeOf(rawUrl: string): string {
  return `${rawUrl}&w=400&q=70&fit=crop&auto=format`;
}

/** Only fetched/rendered at full size once an image is actually saved, not for every grid tile. */
export function saveSizeOf(rawUrl: string): string {
  return `${rawUrl}&w=2000&q=80&auto=format`;
}

/** Shapes a raw Unsplash API photo into the flat result shape the client works with. */
export function toSearchResult(photo: UnsplashPhoto) {
  return {
    id: photo.id,
    title: photo.description ?? photo.alt_description ?? "",
    imageUrl: saveSizeOf(photo.urls.raw),
    thumbUrl: thumbSizeOf(photo.urls.raw),
    sourceUrl: photo.links.html,
    credit: photo.user.name,
    creditUrl: photo.user.links.html,
    downloadLocation: photo.links.download_location,
    color: photo.color ?? "",
  };
}

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
