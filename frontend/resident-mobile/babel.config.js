module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@3minutes/contracts': '../packages/contracts/src/index.ts',
            '@3minutes/design-tokens': '../packages/design-tokens/src/index.ts',
          },
        },
      ],
    ],
  };
};
