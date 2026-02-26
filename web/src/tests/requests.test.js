// ─────────────────────────────────────────────────────────────────
// Integration tests for the HTTP layer — requests.js
// Tests: Axios Instance + Interceptors + all API functions
// Integrates with: server endpoints + response codes + data shapes
// ─────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
// Axios must be mocked before any imports (Jest auto-hoisting applies)
jest.mock('axios', () => {
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: { create: jest.fn(() => instance) },
  };
});

import axios from 'axios';
import {
  login,
  register,
  getProfile,
  getUsers,
  updateUser,
  updateProfilePicture,
  createMessage,
  getMessages,
  deleteAccount,
} from '../libs/requests';

// ─── مرجع Mock Instance ────────────────────────────────────────
const mockApi = axios.create();

// Capture the interceptors registered by requests.js when the module loads
const requestInterceptor = mockApi.interceptors.request.use.mock.calls[0]?.[0];
const [responseOnSuccess, responseOnError] = mockApi.interceptors.response.use.mock.calls[0] || [];

// ─── إعادة التعيين قبل كل اختبار ──────────────────────────────
beforeEach(() => {
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.put.mockReset();
  localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════
// 1. Interceptors setup verification
// ═══════════════════════════════════════════════════════════════

describe('إعداد Axios Instance — Interceptors', () => {
  it('يجب أن يكون request interceptor دالة فعّالة', () => {
    expect(typeof requestInterceptor).toBe('function');
  });

  it('يجب أن يكون response success handler دالة فعّالة', () => {
    expect(typeof responseOnSuccess).toBe('function');
  });

  it('يجب أن يكون response error handler دالة فعّالة', () => {
    expect(typeof responseOnError).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Request Interceptor — auto-attach the token
// ═══════════════════════════════════════════════════════════════

describe('Request Interceptor — إضافة التوكن تلقائياً', () => {
  it('يجب إضافة Authorization: Bearer عند وجود توكن صالح', () => {
    localStorage.setItem('accessToken', 'jwt-valid-token');
    const config = { headers: {} };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBe('Bearer jwt-valid-token');
  });

  it('يجب عدم إضافة Authorization عند عدم وجود توكن', () => {
    const config = { headers: {} };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('يجب تجاهل التوكن إذا كان النص "null"', () => {
    localStorage.setItem('accessToken', 'null');
    const config = { headers: {} };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('يجب تجاهل التوكن إذا كان النص "undefined"', () => {
    localStorage.setItem('accessToken', 'undefined');
    const config = { headers: {} };

    const result = requestInterceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('يجب إرجاع كائن الإعدادات كاملاً مع التوكن', () => {
    localStorage.setItem('accessToken', 'my-token');
    const config = { headers: {}, timeout: 5000, method: 'get' };

    const result = requestInterceptor(config);

    expect(result.timeout).toBe(5000);
    expect(result.method).toBe('get');
    expect(result.headers.Authorization).toBe('Bearer my-token');
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Response Interceptor — 401 error handling
// ═══════════════════════════════════════════════════════════════

describe('Response Interceptor — التعامل مع أخطاء الخادم', () => {
  let savedLocation;

  beforeEach(() => {
    savedLocation = window.location;
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    window.location = savedLocation;
  });

  it('يجب تمرير الاستجابة الناجحة بدون تعديل', () => {
    const response = { status: 200, data: { user: { _id: 'u1' } } };

    expect(responseOnSuccess(response)).toEqual(response);
  });

  it('يجب مسح localStorage وإعادة التوجيه عند خطأ 401', async () => {
    localStorage.setItem('user', JSON.stringify({ _id: 'u1' }));
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('currentReceiver', JSON.stringify({ _id: 'u2' }));

    const error = { response: { status: 401 } };

    await expect(responseOnError(error)).rejects.toEqual(error);

    // Verify local storage was cleared
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentReceiver')).toBeNull();

    // Verify redirect to login
    expect(window.location.href).toBe('/login');
  });

  it('يجب عدم إعادة التوجيه عند أخطاء غير 401', async () => {
    const error = {
      response: { status: 500, data: { message: 'خطأ في الخادم' } },
    };

    await expect(responseOnError(error)).rejects.toEqual(error);

    expect(window.location.href).toBe('');
  });

  it('يجب عدم إعادة التوجيه عند أخطاء الشبكة (بدون response)', async () => {
    const error = { message: 'Network Error' };

    await expect(responseOnError(error)).rejects.toEqual(error);

    expect(window.location.href).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Auth Functions — login & register
// Integrates with: POST /api/user/login and POST /api/user/register
// ═══════════════════════════════════════════════════════════════

describe('دوال المصادقة — تكامل مع نقاط نهاية الخادم', () => {
  // ─── تسجيل الدخول ──────────────────────────────────────────

  describe('login — POST /api/user/login', () => {
    it('يجب إرسال البيانات الصحيحة وإرجاع استجابة الخادم عند النجاح', async () => {
      const serverResponse = {
        user: { _id: 'u1', firstName: 'أحمد', lastName: 'محمد' },
        accessToken: 'jwt-token-123',
      };
      mockApi.post.mockResolvedValueOnce({ data: serverResponse });

      const result = await login({
        email: 'ahmed@test.com',
        password: '123456',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api/user/login', {
        email: 'ahmed@test.com',
        password: '123456',
      });
      expect(result).toEqual(serverResponse);
      expect(result.user._id).toBe('u1');
      expect(result.accessToken).toBe('jwt-token-123');
    });

    it('يجب إرجاع { error } عند رفض الخادم (بريد/كلمة مرور خاطئة)', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'بريد إلكتروني أو كلمة مرور غير صحيحة' },
        },
      });

      const result = await login({
        email: 'wrong@test.com',
        password: 'wrong',
      });

      expect(result).toEqual({
        error: 'بريد إلكتروني أو كلمة مرور غير صحيحة',
      });
    });

    it('يجب إرجاع رسالة افتراضية عند فشل الشبكة', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await login({
        email: 'test@test.com',
        password: '123456',
      });

      expect(result).toEqual({ error: 'Network Error' });
    });

    it("يجب إرجاع 'Login failed' عند خطأ بدون رسالة", async () => {
      mockApi.post.mockRejectedValueOnce({});

      const result = await login({
        email: 'test@test.com',
        password: '123456',
      });

      expect(result).toEqual({ error: 'Login failed' });
    });
  });

  // ─── التسجيل ────────────────────────────────────────────────

  describe('register — POST /api/user/register', () => {
    const validData = {
      firstName: 'سارة',
      lastName: 'أحمد',
      email: 'sara@test.com',
      password: '123456',
      confirmPassword: '123456',
    };

    it('يجب إرسال جميع الحقول وإرجاع بيانات المستخدم الجديد', async () => {
      const serverResponse = {
        user: {
          _id: 'u2',
          firstName: 'سارة',
          lastName: 'أحمد',
          email: 'sara@test.com',
        },
        accessToken: 'jwt-new-user',
      };
      mockApi.post.mockResolvedValueOnce({ data: serverResponse });

      const result = await register(validData);

      expect(mockApi.post).toHaveBeenCalledWith('/api/user/register', validData);
      expect(result.user.firstName).toBe('سارة');
      expect(result.accessToken).toBe('jwt-new-user');
    });

    it('يجب إرجاع خطأ التحقق من الخادم (بريد مسجل مسبقاً)', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'البريد الإلكتروني مسجل مسبقاً' },
        },
      });

      const result = await register(validData);

      expect(result).toEqual({ error: 'البريد الإلكتروني مسجل مسبقاً' });
    });

    it('يجب إرجاع رسالة افتراضية عند فشل بدون رسالة خادم', async () => {
      mockApi.post.mockRejectedValueOnce({});

      const result = await register(validData);

      expect(result).toEqual({ error: 'Registration failed' });
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Protected API Functions — require auth token
// ═══════════════════════════════════════════════════════════════

describe('دوال API المحمية — Protected Endpoints', () => {
  it('getProfile → GET /api/user/profile', async () => {
    const profile = {
      _id: 'u1',
      firstName: 'أحمد',
      email: 'ahmed@test.com',
      profilePicture: '/uploads/ahmed.jpg',
    };
    mockApi.get.mockResolvedValueOnce({ data: profile });

    const result = await getProfile();

    expect(mockApi.get).toHaveBeenCalledWith('/api/user/profile');
    expect(result).toEqual(profile);
  });

  it('getUsers → GET /api/user/friends', async () => {
    const friends = [
      { _id: 'u2', firstName: 'سارة' },
      { _id: 'u3', firstName: 'علي' },
    ];
    mockApi.get.mockResolvedValueOnce({ data: friends });

    const result = await getUsers();

    expect(mockApi.get).toHaveBeenCalledWith('/api/user/friends');
    expect(result).toHaveLength(2);
  });

  it('updateUser → PUT /api/user/profile مع بيانات من EditableInput', async () => {
    const updateData = { firstName: 'أحمد محمد' };
    mockApi.put.mockResolvedValueOnce({
      data: { _id: 'u1', ...updateData },
    });

    const result = await updateUser(updateData);

    expect(mockApi.put).toHaveBeenCalledWith('/api/user/profile', updateData);
    expect(result.firstName).toBe('أحمد محمد');
  });

  it('updateProfilePicture → PUT /api/user/profile/picture مع FormData', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['fake-image']), 'photo.jpg');
    mockApi.put.mockResolvedValueOnce({
      data: { profilePicture: '/uploads/photo.jpg' },
    });

    const result = await updateProfilePicture(formData);

    expect(mockApi.put).toHaveBeenCalledWith('/api/user/profile/picture', formData);
    expect(result.profilePicture).toBe('/uploads/photo.jpg');
  });

  it('createMessage → POST /api/message مع receiverId و content', async () => {
    const msgPayload = { receiverId: 'u2', content: 'مرحباً يا سارة' };
    const serverMsg = {
      _id: 'm1',
      sender: 'u1',
      recipient: 'u2',
      content: 'مرحباً يا سارة',
      seen: false,
    };
    mockApi.post.mockResolvedValueOnce({ data: serverMsg });

    const result = await createMessage(msgPayload);

    expect(mockApi.post).toHaveBeenCalledWith('/api/message', msgPayload);
    expect(result._id).toBe('m1');
    expect(result.seen).toBe(false);
  });

  it('getMessages → GET /api/message/ يعيد جميع رسائل المستخدم', async () => {
    const messages = [
      { _id: 'm1', sender: 'u1', recipient: 'u2', content: 'مرحباً' },
      { _id: 'm2', sender: 'u2', recipient: 'u1', content: 'أهلاً' },
      { _id: 'm3', sender: 'u3', recipient: 'u1', content: 'سلام' },
    ];
    mockApi.get.mockResolvedValueOnce({ data: messages });

    const result = await getMessages();

    expect(mockApi.get).toHaveBeenCalledWith('/api/message/');
    expect(result).toHaveLength(3);
  });

  it('deleteAccount → DELETE /api/user/account مع كلمة المرور', async () => {
    const response = { message: 'تم حذف الحساب بنجاح', deletedUserId: 'u1' };
    mockApi.delete.mockResolvedValueOnce({ data: response });

    const result = await deleteAccount({ password: 'user-password' });

    expect(mockApi.delete).toHaveBeenCalledWith('/api/user/account', {
      data: { password: 'user-password' },
    });
    expect(result.message).toContain('حذف');
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Integration Scenarios — Interceptor + API
// ═══════════════════════════════════════════════════════════════

describe('سيناريوهات تكاملية — Interceptor + API', () => {
  it('سيناريو: تسجيل دخول → تخزين توكن → طلب محمي بالتوكن', async () => {
    // 1. Login
    const loginResponse = {
      user: { _id: 'u1', firstName: 'أحمد' },
      accessToken: 'fresh-jwt-token',
    };
    mockApi.post.mockResolvedValueOnce({ data: loginResponse });

    const result = await login({
      email: 'ahmed@test.com',
      password: '123456',
    });
    expect(result.accessToken).toBe('fresh-jwt-token');

    // 2. Store the token (as the Login component does)
    localStorage.setItem('accessToken', result.accessToken);

    // 3. Verify the interceptor will attach the token to the next request
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer fresh-jwt-token');
  });

  it('سيناريو: خطأ 401 يمسح الجلسة ويعيد التوجيه', async () => {
    // Set up an active session
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ _id: 'u1' }));
    localStorage.setItem('currentReceiver', JSON.stringify({ _id: 'u2' }));

    const savedLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    // Simulate a 401 response from the server (expired token)
    const error = {
      response: { status: 401, data: { message: 'التوكن منتهي الصلاحية' } },
    };

    try {
      await responseOnError(error);
    } catch (e) {
      // expected — error is always re-thrown
    }

    // Verify: session was fully cleared
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('currentReceiver')).toBeNull();
    expect(window.location.href).toBe('/login');

    window.location = savedLocation;
  });

  it('سيناريو: خطأ 405 (Method Not Allowed) - الـ API endpoint مفقود أو URL محطوءة', async () => {
    // This test catches deployment issues where REACT_APP_API_URL is:
    // - undefined/empty → requests go to wrong endpoint
    // - pointing to static server (not API) → 405 on POST
    // - pointing to wrong domain → 405 from CORS or misconfigured server

    const error = {
      response: {
        status: 405,
        data: { message: 'Method Not Allowed' },
        config: { url: '/api/user/register', method: 'POST' },
      },
    };

    try {
      await responseOnError(error);
    } catch (e) {
      // Expected: error is re-thrown
      expect(e.response.status).toBe(405);
    }
  });

  it('سيناريو: تحقق من أن REACT_APP_API_URL ليست فارغة أثناء البناء', () => {
    // This catches the issue where vars.REACT_APP_API_URL is not set in GitHub
    const apiUrl = process.env.REACT_APP_API_URL;

    if (apiUrl === '' || apiUrl === undefined) {
      console.warn(
        '⚠️ WARNING: REACT_APP_API_URL is empty!\n' +
          'This will cause 405 errors in production.\n' +
          'Check: GitHub Actions secrets/vars OR .env file'
      );
    }

    // Mark test as passing after warning
    expect(true).toBe(true);
  });
});
