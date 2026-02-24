// Mock لـ AsyncStorage أثناء الاختبارات — يستخدم Map في الذاكرة بدل التخزين الحقيقي
const store = new Map();

const AsyncStorage = {
  getItem: jest.fn((key) => Promise.resolve(store.get(key) || null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  // دالة مساعدة للاختبارات: الوصول المباشر للتخزين
  _getStore: () => store,
};

export default AsyncStorage;
