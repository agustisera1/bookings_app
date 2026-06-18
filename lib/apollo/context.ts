import type { NextRequest } from "next/server";

export type ApolloContext = {
  req: NextRequest;
};
