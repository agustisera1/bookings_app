import { SchemaLink } from "@apollo/client/link/schema";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { createContext } from "./context";
import { schema } from "./schema";

declare module "@apollo/client" {
  export interface TypeOverrides {
    signatureStyle: "modern";
  }
}

// One client per request, so the loaders never share their cache across users.
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({ schema, context: createContext() }),
    }),
);
