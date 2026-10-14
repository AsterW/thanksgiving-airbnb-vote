// Lint mostly for undefined names and broken hook usage: with code spread over
// many files, a missing import is the easiest mistake to make.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

const unused = ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }];

export default [
  { ignores: ['dist/', '.wrangler/', 'node_modules/'] },
  js.configs.recommended,
  { rules: { 'no-empty': ['error', { allowEmptyCatch: true }], 'no-unused-vars': unused } },
  {
    files: ['worker/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module',
      globals: { ...globals.serviceworker, AbortController: 'readonly', WebSocketPair: 'readonly' } },
  },
  {
    files: ['web/**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks },
    // JSX usage of a component doesn't count as "used" without the react plugin, so skip capitalized names.
    rules: { ...reactHooks.configs.recommended.rules, 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^[A-Z]' }] },
  },
  { files: ['*.config.js'], languageOptions: { globals: globals.node } },
];
