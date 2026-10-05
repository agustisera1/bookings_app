import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import type { NextRequest } from "next/server";
import type { ApolloContext } from "./context";
import { maxRootFieldsRule } from "./limits";
import { schema } from "./schema";

const server = new ApolloServer<ApolloContext>({
  schema,
  validationRules: [maxRootFieldsRule],
});

const handler = startServerAndCreateNextHandler<NextRequest, ApolloContext>(server, {
  context: async () => ({}),
});

export const GET = (req: NextRequest) => handler(req);
export const POST = (req: NextRequest) => handler(req);
