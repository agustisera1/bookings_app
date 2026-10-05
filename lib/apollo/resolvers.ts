import { GraphQLScalarType, Kind } from "graphql";
import type { Resolvers } from "./__generated__/resolvers-types";

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 timestamp",
  serialize: (value) => (value instanceof Date ? value : new Date(String(value))).toISOString(),
  parseValue: (value) => new Date(String(value)),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

export const rootResolvers: Resolvers = { DateTime };
