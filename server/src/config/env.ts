import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI, // undefined => fall back to in-memory Mongo
  jwtSecret: required("JWT_SECRET", "dev-only-insecure-secret"),
  unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY ?? "",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
};
