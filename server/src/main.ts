import "dotenv/config";
import { createServer } from 'http';
import { env } from "./env";
import { createApp } from "./app";
// import { initializeCollaborationServer } from './services/collaboration'; // TEMP DISABLED

async function bootstrap() {
  const app = createApp();
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize real-time collaboration
  // const io = initializeCollaborationServer(httpServer); // TEMP DISABLED

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] Server started (collaboration disabled temporarily)`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
