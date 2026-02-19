module.exports = {
  extends: ['@greenex/eslint-config/nest'],
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  root: true,
  ignorePatterns: ['.eslintrc.js'],
};