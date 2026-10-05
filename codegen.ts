import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./lib/*/schema.graphql",
  generates: {
    "./lib/apollo/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../context#ApolloContext",
        useIndexSignature: true,
        // String unions rather than TS enums, so schema enums stay assignable
        // to their domain counterparts in lib/<service>/types.ts.
        enumsAsTypes: true,
        // Resolvers return the Drizzle `Date`; the scalar serializes it to ISO.
        scalars: { DateTime: { input: "Date", output: "Date | string" } },
      },
    },
    "./lib/apollo/__generated__/operations.ts": {
      documents: ["lib/apollo/queries/**/*.graphql", "app/**/*.graphql"],
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        enumsAsTypes: true,
        scalars: { DateTime: "string" },
      },
    },
  },
};

export default config;
