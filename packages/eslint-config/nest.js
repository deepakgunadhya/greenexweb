module.exports = {
  extends: ['./index.js'],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // NestJS specific rules
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    
    // Allow console.log for logging in NestJS
    'no-console': 'off',
  },
};