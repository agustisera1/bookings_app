// Resolvers read identity from the cookie (`authorize`), so they need nothing from the request.
export type ApolloContext = Record<string, never>;
