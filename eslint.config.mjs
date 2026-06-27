import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["bundle.js", "coverage/**", "dist/**", "node_modules/**", "rom/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts", "global.d.ts"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},
		rules: {
			"no-undef": "off",
			"no-constant-condition": "warn",
			"no-debugger": "warn",
			"no-fallthrough": "warn",
			"no-useless-escape": "off",
			"prefer-const": "off",
			"no-empty": "warn",
			"no-extra-boolean-cast": "warn",
			"no-prototype-builtins": "warn",
			"no-self-assign": "warn",
			"no-useless-assignment": "warn",
			"no-var": "error",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unused-expressions": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
	prettier
);
