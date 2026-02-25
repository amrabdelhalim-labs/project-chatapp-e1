// Mock لـ expo/src/winter runtime
// يمنع تسجيل lazy getters التي تُفشل اختبارات Jest
// السبب: runtime.native.ts يُسجّل __ExpoImportMetaRegistry كـ lazy getter
// يستدعي require() خارج سياق الوحدة مما يُسبب خطأ Jest

// لا نفعل شيئاً — الـ globals المطلوبة مُعرَّفة في jest.setup.js
module.exports = {};
