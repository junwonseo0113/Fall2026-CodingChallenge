import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { collectionsRouter } from "./routes/collections";
import { publicRouter } from "./routes/public";
import { searchRouter } from "./routes/search";
import { resolveRouter } from "./routes/resolve";
import { todayRouter } from "./routes/today";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  // unsplashConfigured lets the client skip search/today-visual requests entirely
  // (rather than firing them and showing an error) when no key is set up --
  // no secret is exposed, just whether one exists.
  app.get("/api/health", (_req, res) => res.json({ status: "ok", unsplashConfigured: Boolean(env.unsplashAccessKey) }));

  app.use("/api/auth", authRouter);
  app.use("/api/collections", collectionsRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/resolve-url", resolveRouter);
  app.use("/api/today-visual", todayRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
