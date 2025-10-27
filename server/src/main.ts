import "dotenv/config";
import { env } from "./env";
import { createApp } from "./app";

async function bootstrap() {
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
