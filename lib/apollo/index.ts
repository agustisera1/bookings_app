import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { resolvers } from "./resolvers";
import { NextRequest } from "next/server";
import schema from "./schema.graphql";
import type { ApolloContext } from "./context";

const server = new ApolloServer<ApolloContext>({ typeDefs: schema, resolvers });
const handler = startServerAndCreateNextHandler<NextRequest, ApolloContext>(
  server,
  {
    context: async (req) => ({ req }),
  },
);

export const GET = (req: NextRequest) => handler(req);
export const POST = (req: NextRequest) => handler(req);
