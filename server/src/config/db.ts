import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connects to MongoDB. If MONGODB_URI is set, connects to that (e.g. a
 * persistent MongoDB Atlas cluster). Otherwise spins up an in-memory
 * MongoDB instance so the app has zero external setup requirements.
 */
export async function connectDatabase(): Promise<void> {
  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB (persistent)");
    return;
  }

  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  console.log("Connected to in-memory MongoDB (set MONGODB_URI to persist data)");

  process.on("SIGINT", async () => {
    await mongoose.disconnect();
    await memoryServer.stop();
    process.exit(0);
  });
}
