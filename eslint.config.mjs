import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // `components/ui/**` es código vendorizado de shadcn: no se edita a mano y se
  // regenera con `shadcn add`. No lo sometemos a reglas más estrictas que su
  // upstream (p. ej. la regla de React Compiler `set-state-in-effect`, que
  // shadcn dispara legítimamente en el carousel).
  {
    files: ["components/ui/**"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // `__generated__/**` es salida de `pnpm codegen`, no se escribe a mano: los
  // plugins de graphql-codegen emiten `any` en algunas firmas de resolver/scalar.
  // No se lintea código regenerable por una regla que no podemos satisfacer sin
  // editar el output a mano.
  {
    files: ["**/__generated__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
