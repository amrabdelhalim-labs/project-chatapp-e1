// ─────────────────────────────────────────────────────────────────
// اختبارات التكامل لطبقة HTTP (requests.js)
// يختبر: Axios Instance + Interceptors + جميع دوال API
// يتكامل مع: globalState.js (للتوكن وتسجيل الخروج), @env (محاكى)
// ─────────────────────────────────────────────────────────────────

// ─── إعداد Mock لـ Axios ─────────────────────────────────────────
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockApi),
}));

// ─── إعداد Mock لـ globalState ───────────────────────────────────
const mockLogout = jest.fn(() => Promise.resolve());
const mockGetState = jest.fn(() => ({
  accessToken: 'test-token-123',
  logout: mockLogout,
}));

jest.mock('../libs/globalState', () => ({
  useStore: { getState: mockGetState },
}));

// ─── استيراد الوحدة بعد إعداد المحاكاة ──────────────────────────
const axios = require('axios');
const {
  register,
  login,
  getProfile,
  getUsers,
  updateUser,
  updateProfilePicture,
  createMessage,
  getMessages,
} = require('../libs/requests');

// ═══════════════════════════════════════════════════════════════
// 1. إعداد Axios Instance — Interceptors
// ═══════════════════════════════════════════════════════════════

describe('إعداد Axios Instance — Interceptors', () => {
  it('يجب أن ينشئ axios.create مع baseURL من @env', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:5000',
    });
  });

  it('يجب أن يسجّل Request Interceptor', () => {
    expect(mockApi.interceptors.request.use).toHaveBeenCalledTimes(1);
  });

  it('يجب أن يسجّل Response Interceptor', () => {
    expect(mockApi.interceptors.response.use).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Request Interceptor — إضافة التوكن تلقائياً
// ═══════════════════════════════════════════════════════════════

describe('Request Interceptor — إضافة التوكن تلقائياً', () => {
  let requestInterceptor;

  beforeAll(() => {
    requestInterceptor = mockApi.interceptors.request.use.mock.calls[0][0];
  });

  it('يجب أن تضيف Authorization header عند وجود توكن', () => {
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('يجب أن لا تضيف Authorization header عند عدم وجود توكن', () => {
    mockGetState.mockReturnValueOnce({ accessToken: null, logout: mockLogout });
    const config = { headers: {} };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('يجب أن تُرجع config دائماً', () => {
    const config = { headers: {}, url: '/api/test' };
    const result = requestInterceptor(config);
    expect(result.url).toBe('/api/test');
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Response Interceptor — التعامل مع أخطاء الخادم
// ═══════════════════════════════════════════════════════════════

describe('Response Interceptor — التعامل مع أخطاء الخادم', () => {
  let successHandler, errorHandler;

  beforeAll(() => {
    [successHandler, errorHandler] = mockApi.interceptors.response.use.mock.calls[0];
  });

  it('يجب أن يمرّر الاستجابات الناجحة بدون تغيير', () => {
    const response = { data: { message: 'OK' }, status: 200 };
    expect(successHandler(response)).toEqual(response);
  });

  it('يجب أن يستدعي logout عند خطأ 401', async () => {
    const error = { response: { status: 401 } };
    await expect(errorHandler(error)).rejects.toEqual(error);
    expect(mockLogout).toHaveBeenCalled();
  });

  it('يجب أن لا يستدعي logout عند خطأ 500', async () => {
    mockLogout.mockClear();
    const error = { response: { status: 500 } };
    await expect(errorHandler(error)).rejects.toEqual(error);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('يجب أن يرفض الخطأ دائماً (لا يبتلعه)', async () => {
    const error = { response: { status: 400 }, message: 'Bad Request' };
    await expect(errorHandler(error)).rejects.toEqual(error);
  });

  it('يجب أن يتعامل مع خطأ شبكة بدون response', async () => {
    mockLogout.mockClear();
    const error = { message: 'Network Error' };
    await expect(errorHandler(error)).rejects.toEqual(error);
    // لا يستدعي logout لأنه ليس 401
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. دوال المصادقة — تكامل مع نقاط نهاية الخادم
// ═══════════════════════════════════════════════════════════════

describe('دوال المصادقة — تكامل مع نقاط نهاية الخادم', () => {
  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
  });

  describe('login', () => {
    it('يجب أن تُرجع بيانات المستخدم عند النجاح', async () => {
      const responseData = {
        user: { _id: 'u1', firstName: 'أحمد' },
        accessToken: 'token-123',
        message: 'تم تسجيل الدخول بنجاح',
      };
      mockApi.post.mockResolvedValue({ data: responseData });

      const result = await login({ email: 'test@test.com', password: '123456' });

      expect(result).toEqual(responseData);
      expect(mockApi.post).toHaveBeenCalledWith('/api/user/login', {
        email: 'test@test.com',
        password: '123456',
      });
    });

    it('يجب أن تُرجع { error } عند فشل تسجيل الدخول', async () => {
      mockApi.post.mockRejectedValue({
        response: { data: { message: 'كلمة المرور غير صحيحة' } },
      });

      const result = await login({ email: 'test@test.com', password: 'wrong' });
      expect(result).toEqual({ error: 'كلمة المرور غير صحيحة' });
    });

    it('يجب أن تُرجع رسالة افتراضية عند خطأ بدون message', async () => {
      mockApi.post.mockRejectedValue({});

      const result = await login({ email: 'test@test.com', password: '123456' });
      expect(result).toEqual({ error: 'Login failed' });
    });
  });

  describe('register', () => {
    it('يجب أن تُرجع بيانات المستخدم عند النجاح', async () => {
      const responseData = {
        user: { _id: 'u1', firstName: 'أحمد' },
        message: 'تم التسجيل بنجاح',
      };
      mockApi.post.mockResolvedValue({ data: responseData });

      const result = await register({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@test.com',
        password: '123456',
        confirmPassword: '123456',
      });

      expect(result).toEqual(responseData);
    });

    it('يجب أن تُرجع { error } عند فشل التسجيل', async () => {
      mockApi.post.mockRejectedValue({
        response: { data: { message: 'البريد الإلكتروني مستخدم بالفعل' } },
      });

      const result = await register({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'exists@test.com',
        password: '123456',
        confirmPassword: '123456',
      });

      expect(result).toEqual({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    });

    it('يجب أن تُرجع رسالة افتراضية عند خطأ بدون message', async () => {
      mockApi.post.mockRejectedValue({});

      const result = await register({
        firstName: 'أحمد',
        lastName: 'محمد',
        email: 'test@test.com',
        password: '123456',
        confirmPassword: '123456',
      });

      expect(result).toEqual({ error: 'Registration failed' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. دوال API المحمية — Protected Endpoints
// ═══════════════════════════════════════════════════════════════

describe('دوال API المحمية — Protected Endpoints', () => {
  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
  });

  it('يجب أن تستدعي getProfile نقطة /api/user/profile', async () => {
    mockApi.get.mockResolvedValue({ data: { _id: 'u1', firstName: 'أحمد' } });

    const result = await getProfile();
    expect(result).toEqual({ _id: 'u1', firstName: 'أحمد' });
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/profile');
  });

  it('يجب أن تستدعي getUsers نقطة /api/user/friends', async () => {
    mockApi.get.mockResolvedValue({
      data: [{ _id: 'u2', firstName: 'سارة' }],
    });

    const result = await getUsers();
    expect(result).toEqual([{ _id: 'u2', firstName: 'سارة' }]);
    expect(mockApi.get).toHaveBeenCalledWith('/api/user/friends');
  });

  it('يجب أن تستدعي updateUser نقطة /api/user/profile مع البيانات', async () => {
    mockApi.put.mockResolvedValue({
      data: { _id: 'u1', firstName: 'أحمد المحدّث' },
    });

    const result = await updateUser({ firstName: 'أحمد المحدّث' });
    expect(result).toEqual({ _id: 'u1', firstName: 'أحمد المحدّث' });
    expect(mockApi.put).toHaveBeenCalledWith('/api/user/profile', {
      firstName: 'أحمد المحدّث',
    });
  });

  it('يجب أن تستدعي createMessage نقطة /api/message', async () => {
    mockApi.post.mockResolvedValue({
      data: { _id: 'm1', content: 'مرحباً' },
    });

    const result = await createMessage({
      receiverId: 'u2',
      content: 'مرحباً',
    });

    expect(result).toEqual({ _id: 'm1', content: 'مرحباً' });
    expect(mockApi.post).toHaveBeenCalledWith('/api/message', {
      receiverId: 'u2',
      content: 'مرحباً',
    });
  });

  it('يجب أن تستدعي getMessages نقطة /api/message/', async () => {
    mockApi.get.mockResolvedValue({
      data: [{ _id: 'm1', content: 'مرحباً' }],
    });

    const result = await getMessages();
    expect(result).toEqual([{ _id: 'm1', content: 'مرحباً' }]);
    expect(mockApi.get).toHaveBeenCalledWith('/api/message/');
  });

  it('يجب أن ترسل updateProfilePicture FormData لنقطة /api/user/profile/picture', async () => {
    mockApi.put.mockResolvedValue({
      data: { _id: 'u1', profilePicture: 'http://example.com/photo.jpg' },
    });

    const result = await updateProfilePicture('file:///photos/photo.jpg');

    expect(result.profilePicture).toBe('http://example.com/photo.jpg');
    expect(mockApi.put).toHaveBeenCalledWith(
      '/api/user/profile/picture',
      expect.any(Object) // FormData
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. سيناريوهات تكاملية — Interceptor + API + Store
// يحاكي: تدفقات واقعية بين طبقة HTTP والمتجر
// ═══════════════════════════════════════════════════════════════

describe('سيناريوهات تكاملية — Interceptor + API', () => {
  let requestInterceptor;

  beforeAll(() => {
    requestInterceptor = mockApi.interceptors.request.use.mock.calls[0][0];
  });

  it('سيناريو: تسجيل دخول → تخزين توكن → طلب محمي بالتوكن', async () => {
    // 1. تسجيل الدخول
    const loginResponse = {
      user: { _id: 'u1', firstName: 'أحمد' },
      accessToken: 'fresh-jwt-token',
    };
    mockApi.post.mockResolvedValueOnce({ data: loginResponse });

    const result = await login({ email: 'ahmed@test.com', password: '123456' });
    expect(result.accessToken).toBe('fresh-jwt-token');

    // 2. محاكاة تخزين التوكن في المتجر (كما يفعل Login screen)
    mockGetState.mockReturnValueOnce({
      accessToken: result.accessToken,
      logout: mockLogout,
    });

    // 3. التحقق أن Interceptor سيضيف التوكن للطلب التالي
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer fresh-jwt-token');
  });

  it('سيناريو: خطأ 401 يستدعي logout لمسح الجلسة', async () => {
    const [, errorHandler] = mockApi.interceptors.response.use.mock.calls[0];
    mockLogout.mockClear();

    // محاكاة استجابة 401 من الخادم (توكن منتهي الصلاحية)
    const error = {
      response: { status: 401, data: { message: 'التوكن منتهي الصلاحية' } },
    };

    try {
      await errorHandler(error);
    } catch (e) {
      // متوقع — الخطأ يُرفض دائماً
    }

    // تحقق: logout استُدعيت (تمسح AsyncStorage والمتجر)
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('سيناريو: خطأ شبكة يمرّر الخطأ بدون مسح الجلسة', async () => {
    const [, errorHandler] = mockApi.interceptors.response.use.mock.calls[0];
    mockLogout.mockClear();

    // خطأ شبكة بدون response (مثل: الخادم غير متاح)
    const error = { message: 'Network Error' };

    try {
      await errorHandler(error);
    } catch (e) {
      expect(e.message).toBe('Network Error');
    }

    // لم يُستدعى logout لأنه ليس 401
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
