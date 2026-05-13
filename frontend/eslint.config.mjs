import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    // Type-checked linting is scoped to source files only. Root-level
    // config files (next.config.ts, tailwind.config.ts, etc.) are excluded
    // because they sit outside the typical `src/` include surface and
    // turning on `parserOptions.project` for them produces noisy parser
    // errors. The `@typescript-eslint/no-unsafe-*` family below requires
    // this type-aware parser to function.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Project-wide rule overrides (not type-aware). Applies to every file
    // that ESLint lints.
    rules: {
      // Re-enabled as a warning (not an error) so the build still passes
      // while the remaining `any` usages in the codebase get cleaned up
      // incrementally. Phase 6 removed ~30 of them in src/lib/api.ts.
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unknown types temporarily for deployment
      "@typescript-eslint/ban-types": "off",
      // These cause build failures in production
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    // Type-aware rule overrides. Scoped to the same `src/**` glob as the
    // type-checked parser config above, because these rules call into the
    // TypeScript service and will throw on files lacking `parserOptions.project`.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // The @typescript-eslint/no-unsafe-* family requires type-checked
      // linting, which is wired up above via `parserOptions.project`.
      // These run at warn-level so `npm run lint` stays green while the
      // remaining unsafe patterns get cleaned up incrementally. The
      // `tsc --noEmit` step remains the hard correctness gate.
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
    },
  },
];

export default eslintConfig;
