import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { collectionsRouter } from "./routes/collections";
import { publicRouter } from "./routes/public";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/collections", collectionsRouter);
  app.use("/api/public", publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
