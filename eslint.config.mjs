import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import esX from "eslint-plugin-es-x";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "es-x": esX },
    rules: {
      "es-x/no-uint8array-prototype-tohex": "error",
      "es-x/no-map-prototype-getorinsert": "error",
      "es-x/no-map-prototype-getorinsertcomputed": "error",
      "es-x/no-weakmap-prototype-getorinsert": "error",
      "es-x/no-weakmap-prototype-getorinsertcomputed": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
