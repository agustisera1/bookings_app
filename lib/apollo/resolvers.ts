import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import type { Resolvers } from "./__generated__/resolvers-types";

function toDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime()))
    throw new GraphQLError("DateTime must be an ISO-8601 timestamp", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  return date;
}

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 timestamp",
  serialize: (value) => toDate(value).toISOString(),
  parseValue: toDate,
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? toDate(ast.value) : null),
});

export const rootResolvers: Resolvers = { DateTime };
