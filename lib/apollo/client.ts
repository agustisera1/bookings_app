import { SchemaLink } from "@apollo/client/link/schema";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { schema } from "./schema";

declare module "@apollo/client" {
  export interface TypeOverrides {
    signatureStyle: "modern";
  }
}

// Runs the schema in-process: a Server Component reading through HTTP to its own
// route would pay a network hop. Resolvers read the session from `cookies()` directly.
export const { getClient, query, PreloadQuery } = registerApolloClient(
  () =>
    new ApolloClient({
      cache: new InMemoryCache(),
      link: new SchemaLink({ schema }),
    }),
);
