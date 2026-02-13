import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Ignore generated/third-party files and test infrastructure
    ignores: [
      "dist",
      "src/components/ui/**",   // shadcn-generated components
      "e2e/**",                  // Playwright test files (different rule set)
      "scripts/**",              // Node.js CJS scripts
      "tailwind.config.ts",      // generated config with require()
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Downgrade to warn — the codebase uses `any` in places where typing is genuinely hard.
      // New code should avoid `any`; existing usage is tracked as a warning.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
