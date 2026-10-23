import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/coverage/**', '**/.package-resources/**', '**/release/**', 'apps/desktop/.package-resources/**', 'apps/desktop/release/**'] },
  js.configs.recommended,
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { console: 'readonly', process: 'readonly', window: 'readonly', document: 'readonly' }
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['packages/domain/**/*.ts', 'packages/simulation/**/*.ts', 'packages/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['electron', 'react', 'react-dom', 'prisma', '@prisma/client', 'node:*'], message: 'Domain/simulation must remain platform and persistence independent.' }
        ]
      }]
    }
  }
];
