// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'functions/*'],
  },
  {
    // eslint-config-expo 56 turned on the React Compiler rules from
    // eslint-plugin-react-hooks 7. Existing code trips them in ~30 places
    // (setState in effects, Date.now() in render, ref reads in render).
    // They're optimisation hints, not crashes: the compiler skips those
    // components. Warn until each spot is reworked, rather than block lint.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
]);
