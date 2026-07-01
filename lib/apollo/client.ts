import { HttpLink } from "@apollo/client";
import {
  registerApolloClient,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client-integration-nextjs";
import { cookies } from "next/headers";

declare module "@apollo/client" {
  export interface TypeOverrides {
    signatureStyle: "modern";
  }
}

// Ideal for RSC
export const { getClient, query, PreloadQuery } = registerApolloClient(
  async () => {
    const headers = {
      cookie: (await cookies()).toString(),
    };

    return new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({
        uri: "http://localhost:3000/api/graphql",
        headers,
      }),
    });
  },
);
