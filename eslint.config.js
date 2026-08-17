import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".impeccable/**"] },
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
      "react-refresh/only-export-components": ["warn", {
        allowConstantExport: true,
        // These are deliberately co-located pure helpers/hooks/constants used
        // by both their component and focused tests or adjacent screens.
        allowExportNames: [
          "setErrorBoundaryUserId",
          "hasAcceptedAIPrivacy",
          "useAIPrivacyDisclosure",
          "getAvatarColor",
          "getScoreLabel",
          "getScoreColorClass",
          "organizeResumeHierarchy",
          "parseDateString",
          "buildDateString",
          "templateComponents",
          "usePageCutHintPulse",
          "extractKeywords",
          "computeMatch",
          "resolveFeatureEntryOrigin",
          "WORKSPACE_SHELL_ROUTES",
          "isWorkspaceShellRoute",
          "detectWiseVariant",
          "ACCENT_PRESETS",
          "THEMES",
          "buildCompletionItems",
          "DEFAULT_SECTIONS",
          "SECTION_LABELS",
          "buildTypewriterPhrases",
          "DEFAULT_CONTENT",
          "derivedText",
          "DEFAULT_FRAME",
          "exportWithFrame",
          "DEPARTMENTS",
          "formatTailoringHubDate",
          "getUploadErrorCopy",
          "parseWiseActionsBlock",
          "useWiseWorkspaceGlobalEvents",
        ],
      }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Fast Refresh does not apply to test helpers, co-located context hooks, or
    // the shadcn-style UI primitives that intentionally export variant helpers.
    files: [
      "**/*.test.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "src/context/**/*.tsx",
      "src/contexts/**/*.tsx",
      "src/i18n/LocaleProvider.tsx",
      "src/components/ui/**/*.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
