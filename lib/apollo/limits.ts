import { GraphQLError, Kind } from "graphql";
import type {
  SelectionSetNode,
  ValidationContext,
  ValidationRule,
} from "graphql";

export const MAX_ROOT_FIELDS = 10;

// Cuenta los campos de nivel raíz atravesando fragment spreads e inline fragments,
// así un `query { ...F }` con F lleno de alias no evade el tope. `seen` corta ciclos.
function countRootFields(
  selectionSet: SelectionSetNode,
  context: ValidationContext,
  seen: Set<string>,
): number {
  let count = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      count += 1;
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      count += countRootFields(selection.selectionSet, context, seen);
    } else {
      const name = selection.name.value;
      if (seen.has(name)) continue;
      seen.add(name);
      const fragment = context.getFragment(name);
      if (fragment)
        count += countRootFields(fragment.selectionSet, context, seen);
    }
  }
  return count;
}

export const maxRootFieldsRule: ValidationRule = (context) => ({
  OperationDefinition(node) {
    if (countRootFields(node.selectionSet, context, new Set()) > MAX_ROOT_FIELDS)
      context.reportError(
        new GraphQLError(
          `Query exceeds the maximum of ${MAX_ROOT_FIELDS} root fields.`,
          { nodes: node },
        ),
      );
  },
});
