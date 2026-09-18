/**
 * Browsers don't expose a JS API to write directly into a native photo
 * library (that's an app-store-app-only permission). The closest real
 * equivalent on the web is the native OS share sheet via the Web Share API
 * -- on a phone, that sheet includes "Save Image"/"Add to Photos" and is
 * itself the permission gate. Where that's unavailable (most desktop
 * browsers), this downloads the image as a blob instead.
 *
 * Note: a plain `<a href=imageUrl download>` does NOT work here -- browsers
 * only honor the `download` attribute for same-origin (or blob:/data:) URLs.
 * For a cross-origin image (e.g. Unsplash's CDN) it's ignored and the browser
 * just navigates to the image instead, which would blow away the whole app.
 * Fetching the image into a blob first sidesteps that entirely.
 */

const SHARE_TIMEOUT_MS = 4000;
const FETCH_TIMEOUT_MS = 8000;

/** navigator.share() can hang forever in environments with no OS share
 * target to hand off to (observed in headless/kiosk browsers) -- races it
 * against a timeout so the button can never go dead on click. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function clickAnchor(href: string, opts: { download?: string; newTab?: boolean }) {
  const link = document.createElement("a");
  link.href = href;
  if (opts.download) link.download = opts.download;
  if (opts.newTab) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function saveImageToDevice(
  imageUrl: string,
  filename: string
): Promise<"shared" | "downloaded" | "opened" | "cancelled"> {
  let blob: Blob | null = null;
  try {
    const response = await fetchWithTimeout(imageUrl, FETCH_TIMEOUT_MS);
    if (response.ok) blob = await response.blob();
  } catch {
    blob = null; // CORS-blocked, network error, or timed out -- handled below.
  }

  if (blob && typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator) {
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await withTimeout(navigator.share({ files: [file] }), SHARE_TIMEOUT_MS);
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        // Any other share failure (including our own timeout) falls through below.
      }
    }
  }

  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    clickAnchor(blobUrl, { download: filename });
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    return "downloaded";
  }

  // Couldn't fetch the image ourselves (likely no CORS on this host) -- opening
  // it in a new tab at least lets the user save it manually, without navigating
  // our own app away.
  clickAnchor(imageUrl, { newTab: true });
  return "opened";
}
