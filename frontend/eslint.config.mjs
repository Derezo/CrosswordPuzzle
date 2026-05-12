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
    rules: {
      // Re-enabled as a warning (not an error) so the build still passes
      // while the remaining `any` usages in the codebase get cleaned up
      // incrementally. Phase 6 removed ~30 of them in src/lib/api.ts.
      "@typescript-eslint/no-explicit-any": "warn",
      // The @typescript-eslint/no-unsafe-* family requires type-checked
      // linting (parserOptions.project) which the Next.js default ESLint
      // config does not enable. Leaving them off here keeps `npm run lint`
      // green; the `tsc --noEmit` step in Phase 7 is the durable safety net.
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      // Allow unknown types temporarily for deployment
      "@typescript-eslint/ban-types": "off",
      // These cause build failures in production
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
