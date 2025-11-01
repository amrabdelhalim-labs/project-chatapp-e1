module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",  // مسار ملف .env
        },
      ],
      // يجب أن يكون plugin الخاص بـ reanimated في آخر قائمة plugins
      "react-native-reanimated/plugin",
    ],
  };
};