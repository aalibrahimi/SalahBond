// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions is Deno (npm: specifiers), not app code.
    ignores: ["dist/*", "supabase/functions/*"],
  }
]);
