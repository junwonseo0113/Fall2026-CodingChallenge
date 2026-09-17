import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// The literal placeholder from .env.example -- treat it the same as "unset" so
// copying .env.example to .env without editing it fails with a clear error
// instead of sending a fake key to Unsplash and getting back a generic 401.
const UNSPLASH_PLACEHOLDER = "your-unsplash-access-key";

const rawUnsplashKey = process.env.UNSPLASH_ACCESS_KEY ?? "";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI, // undefined => fall back to in-memory Mongo
  jwtSecret: required("JWT_SECRET", "dev-only-insecure-secret"),
  unsplashAccessKey: rawUnsplashKey === UNSPLASH_PLACEHOLDER ? "" : rawUnsplashKey,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
