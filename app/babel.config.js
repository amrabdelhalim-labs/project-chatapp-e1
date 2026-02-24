module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // يُستبعد أثناء الاختبارات لأن moduleNameMapper في Jest يوفّر mock لـ @env
  if (process.env.NODE_ENV !== "test") {
    plugins.push([
      "module:react-native-dotenv",
      {
        moduleName: "@env",
        path: ".env",  // مسار ملف .env
      },
    ]);
  }

  // يجب أن يكون plugin الخاص بـ reanimated في آخر قائمة plugins
  // يُستبعد أثناء الاختبارات لأنه يحتاج react-native-worklets/plugin
  if (process.env.NODE_ENV !== "test") {
    plugins.push("react-native-reanimated/plugin");
  }

  return {
    presets: ["babel-preset-expo"],
    plugins,
  };
};