import { createApp } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
