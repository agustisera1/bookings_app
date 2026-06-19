import { HttpLink } from "@apollo/client";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";

declare module "@apollo/client" {
  export interface TypeOverrides {
    signatureStyle: "modern";
  }
}

// Ideal for RSC
export const { getClient, query, PreloadQuery } = registerApolloClient(() => {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      // Use an absolute URL for SSR (relative URLs cannot be used in SSR)
      uri: "http://localhost:3000/api/graphql",
      fetchOptions: {},
    }),
  });
});
