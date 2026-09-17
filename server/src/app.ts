import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
