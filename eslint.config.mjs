import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/.expo/**', '**/dist/**', '**/expo-env.d.ts', '**/next-env.d.ts'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.cjs'], rules: {'@typescript-eslint/no-require-imports': 'off'} },
  { files: ['**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks }, rules: {
    ...hooks.configs.recommended.rules,
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  }}
);
