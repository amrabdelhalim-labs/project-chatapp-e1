// ─────────────────────────────────────────────────────────────────
// Jest Setup — Compatibility fixes for Expo SDK 54 in test environment
// ─────────────────────────────────────────────────────────────────

// ─── Fix 1: Expo Winter Runtime ────────────────────────────────
// expo/src/winter/runtime.native.ts registers lazy getters via installGlobal()
// One of them, __ExpoImportMetaRegistry, calls require() lazily.
// When the getter is accessed outside Jest's module scope it throws:
// "You are trying to import a file outside of the scope of the test code"
//
// Solution: define all globals before the winter runtime runs,
// using a plain value instead of a lazy getter.
if (!global.__ExpoImportMetaRegistry) {
  Object.defineProperty(global, '__ExpoImportMetaRegistry', {
    value: { url: 'http://localhost' },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

// ─── Fix 2: TextDecoder / TextEncoder ─────────────────────────
// Required by some React Native libraries in a Node environment.
const { TextEncoder, TextDecoder } = require('util');
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

// ─── Fix 3: structuredClone ────────────────────────────────────
// Available in Node 17+ but Expo may polyfill it early.
if (!global.structuredClone) {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// ─── Fix 4: URL and URLSearchParams ───────────────────────────
if (!global.URL) {
  const { URL, URLSearchParams } = require('url');
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;
}
