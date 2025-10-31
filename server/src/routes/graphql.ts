/**
 * GraphQL API Endpoint
 * Modern alternative to REST endpoints
 */

import { Router } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';

export const graphqlRouter = Router();

// Create Apollo Server instance
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true, // Enable GraphQL Playground in development
  formatError: (error) => {
    console.error('[graphql] Error:', error);
    return {
      message: error.message,
      code: (error.extensions?.code as string) || 'INTERNAL_SERVER_ERROR',
      path: error.path,
    };
  },
});

// Initialize Apollo Server
let serverInitialized = false;

graphqlRouter.use('/', async (req, res, next) => {
  if (!serverInitialized) {
    await apolloServer.start();
    serverInitialized = true;
  }
  next();
});

// GraphQL endpoint with Express middleware
graphqlRouter.use(
  '/',
  expressMiddleware(apolloServer, {
    context: async ({ req }: any) => {
      // Pass request context (tenant, user, prisma) to resolvers
      return {
        prisma: req.context.prisma,
        tenantId: req.context.tenantId,
        user: req.context.user,
      };
    },
  })
);

export { apolloServer };

