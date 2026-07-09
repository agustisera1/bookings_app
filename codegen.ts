import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./lib/apollo/schema.graphql",
  generates: {
    "./lib/apollo/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../context#ApolloContext",
        useIndexSignature: true,
      },
    },
    "./lib/apollo/__generated__/operations.ts": {
      documents: ["lib/apollo/queries/**/*.graphql", "app/**/*.graphql"],
      plugins: ["typescript-operations", "typed-document-node"],
    },
  },
};

export default config;
