export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "tsconfig.tsbuildinfo"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    }
  }
];
