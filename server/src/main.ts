import "dotenv/config";
import { createServer } from 'http';
import { env } from "./env";
import { createApp } from "./app";
import { initializeCollaborationServer } from './services/collaboration';

async function bootstrap() {
  const app = createApp();
  
  // Create HTTP server for Socket.io
  const httpServer = createServer(app);

  // Initialize real-time collaboration
  const io = initializeCollaborationServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] Real-time collaboration enabled`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
