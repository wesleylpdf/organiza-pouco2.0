export default [
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      prettier: await import('eslint-plugin-prettier').then(m => m.default),
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },
];
