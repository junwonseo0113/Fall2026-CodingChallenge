import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { requireAuth } from "../middleware/auth";

export const resolveRouter = Router();

resolveRouter.use(requireAuth);

const querySchema = z.object({ url: z.string().url() });

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 300_000; // og:image is always in <head>, no need to read a whole page

/** Blocks requests to loopback/private/link-local addresses so this proxy can't be used to probe internal services. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host === "0.0.0.0") return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

async function fetchWithTimeout(url: string, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

interface ResolvedImage {
  imageUrl: string;
  thumbUrl: string;
  sourceUrl: string;
  credit: string;
  creditUrl: string;
  downloadLocation: string;
}

/** Unsplash photo *page* URLs (unsplash.com/photos/slug-ID) aren't themselves
 * image files -- extracts the photo ID so we can hit the API for the real
 * high-res asset and attribution instead of scraping the page. */
function extractUnsplashPhotoId(parsed: URL): string | null {
  if (!/(^|\.)unsplash\.com$/.test(parsed.hostname)) return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  const photosIdx = segments.indexOf("photos");
  if (photosIdx === -1 || !segments[photosIdx + 1]) return null;
  const slug = segments[photosIdx + 1];
  // Unsplash IDs are the trailing 11-char base62 token, optionally preceded by a "-"-joined title slug.
  const lastDash = slug.lastIndexOf("-");
  return lastDash === -1 ? slug : slug.slice(lastDash + 1);
}

async function resolveUnsplashPhoto(photoId: string): Promise<ResolvedImage> {
  if (!env.unsplashAccessKey) {
    throw new AppError(500, "Set a real UNSPLASH_ACCESS_KEY in server/.env to resolve Unsplash links");
  }
  const response = await fetchWithTimeout(`https://api.unsplash.com/photos/${encodeURIComponent(photoId)}`, {
    Authorization: `Client-ID ${env.unsplashAccessKey}`,
  });
  if (!response.ok) throw new AppError(404, "Couldn't find that Unsplash photo");
  const photo = (await response.json()) as {
    urls: { raw: string };
    links: { html: string; download_location: string };
    user: { name: string; links: { html: string } };
  };
  return {
    imageUrl: `${photo.urls.raw}&w=2000&q=80&auto=format`,
    thumbUrl: `${photo.urls.raw}&w=400&q=70&fit=crop&auto=format`,
    sourceUrl: photo.links.html,
    credit: photo.user.name,
    creditUrl: photo.user.links.html,
    downloadLocation: photo.links.download_location,
  };
}

/** Reads up to MAX_HTML_BYTES of a response body as text (og:image always lives in <head>). */
async function readBodyPrefix(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (text.length < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return text;
}

function extractOgImage(html: string): string | null {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/** Fetches once and sniffs Content-Type: a direct image (e.g. an extension-less
 * Unsplash CDN link) passes through as-is, an HTML page gets its og:image scraped. */
async function resolveGenericUrl(url: string): Promise<ResolvedImage> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new AppError(400, "Couldn't reach that URL");

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) {
    response.body?.cancel().catch(() => {});
    return { imageUrl: url, thumbUrl: url, sourceUrl: url, credit: "", creditUrl: "", downloadLocation: "" };
  }

  if (contentType.includes("text/html")) {
    const html = await readBodyPrefix(response);
    const ogImage = extractOgImage(html);
    if (ogImage)
      return { imageUrl: ogImage, thumbUrl: ogImage, sourceUrl: url, credit: "", creditUrl: "", downloadLocation: "" };
  }

  throw new AppError(400, "Couldn't find an image at that URL");
}

/**
 * GET /api/resolve-url?url= -- requires auth.
 * Turns a pasted link into a saveable image: an Unsplash photo *page* URL
 * resolves via the Unsplash API (full-res + attribution), a direct image
 * URL passes through as-is, and any other page gets its og:image scraped.
 */
resolveRouter.get("/", async (req, res, next) => {
  try {
    const { url } = querySchema.parse(req.query);
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || isPrivateHost(parsed.hostname)) {
      throw new AppError(400, "That URL can't be resolved");
    }

    const unsplashId = extractUnsplashPhotoId(parsed);
    if (unsplashId) {
      res.json(await resolveUnsplashPhoto(unsplashId));
      return;
    }

    // Skip the network round-trip for the common case where the extension already tells us.
    if (IMAGE_EXTENSION_RE.test(parsed.pathname)) {
      res.json({ imageUrl: url, thumbUrl: url, sourceUrl: url, credit: "", creditUrl: "", downloadLocation: "" });
      return;
    }

    res.json(await resolveGenericUrl(url));
  } catch (err) {
    next(err);
  }
});
