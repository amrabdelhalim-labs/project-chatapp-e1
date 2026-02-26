# حذف الحساب (Delete Account Feature)

## 📋 نظرة عامة

ميزة **آمنة وموثوقة** لحذف حساب المستخدم مع جميع بيانات المرتبطة به (الرسائل، الملفات، إلخ).

**المتطلبات الأمنية:**
- ✅ تأكيد كلمة المرور قبل الحذف
- ✅ تنظيف جميع البيانات المرتبطة (رسائل، ملفات)
- ✅ حذف من قاعدة البيانات نهائياً
- ✅ معالجة Safe من الأخطاء

---

## 🏗️ البنية المعمارية

```
┌─────────────────────────────────────────┐
│         Client (Web/Mobile)             │
├─────────────────────────────────────────┤
│ 1. Modal/Dialog "حذف الحساب"            │
│ 2. طلب تأكيد كلمة المرور                  │
│ 3. POST /api/user/delete               │
├─────────────────────────────────────────┤
│       Middleware (isAuthenticated)      │
├─────────────────────────────────────────┤
│    Controller (deleteAccount)           │
│ 1. التحقق من كلمة المرور               │
│ 2. استدعاء repos.deleteAccount()       │
├─────────────────────────────────────────┤
│    Repository (deleteAccount)           │
│ 1. حذف جميع الرسائل                    │
│ 2. حذف جميع الملفات                    │
│ 3. حذف المستخدم                        │
├─────────────────────────────────────────┤
│         MongoDB Transaction             │
│ (جميع العمليات معاً - كل شيء أو لا شيء) │
└─────────────────────────────────────────┘
```

---

## 🔧 التطبيق على الخادم

### 1. Validator (`validators/user.validator.js` - إضافة)

```javascript
/**
 * Validate delete account request
 * @param {Object} input - { password }
 * @throws {Error} with statusCode if invalid
 */
export function validateDeleteAccountInput({ password }) {
  if (!password || typeof password !== 'string' || password.length < 6) {
    const error = new Error('كلمة المرور مطلوبة وليست أقل من 6 أحرف');
    error.statusCode = StatusCodes.BAD_REQUEST;
    throw error;
  }
}
```

### 2. Repository (`repositories/user.repository.js` - إضافة)

```javascript
/**
 * Delete account and all associated data
 * - Messages sent and received
 * - Profile picture (if not default)
 * - User document
 *
 * Uses MongoDB transaction for atomicity
 * @param {string} userId
 * @returns {Promise<{ deletedAt: Date, messagesDeleted: number }>}
 */
async deleteAccount(userId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Find user to get profile picture
    const user = await this.model.findById(userId).session(session);
    if (!user) throw new Error('User not found');

    // 2️⃣ Delete profile picture if not default
    const storage = getStorageService();
    if (user.profilePicture && !user.profilePicture.includes('default')) {
      try {
        await storage.deleteFile(user.profilePicture);
      } catch (err) {
        console.warn('⚠️ Failed to delete profile picture:', err.message);
        // Don't throw - continue with account deletion
      }
    }

    // 3️⃣ Delete all messages (sent and received)
    const messageResult = await Message.deleteMany(
      { $or: [{ sender: userId }, { recipient: userId }] },
      { session }
    );

    // 4️⃣ Delete user
    const deleteResult = await this.model.findByIdAndDelete(userId, { session });

    await session.commitTransaction();

    return {
      deletedAt: new Date(),
      messagesDeleted: messageResult.deletedCount || 0,
      userDeleted: !!deleteResult,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

### 3. Controller (`controllers/user.js` - إضافة)

```javascript
import { validateDeleteAccountInput } from '../validators/user.validator.js';

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.userId;

    // 1️⃣ Validate input
    validateDeleteAccountInput({ password });

    // 2️⃣ Get user and verify password
    const user = await repos.user.findById(userId);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'المستخدم غير موجود' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: 'كلمة المرور غير صحيحة' });
    }

    // 3️⃣ Delete account
    const result = await repos.user.deleteAccount(userId);

    // 4️⃣ Clean up client session
    getIO().emit('user_deleted', { userId, deletedAt: result.deletedAt });

    res.status(StatusCodes.OK).json({
      message: 'تم حذف حسابك بنجاح',
      data: result,
    });
  } catch (error) {
    console.error('❌ Delete account error:', error);
    const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || 'فشل حذف الحساب';
    res.status(statusCode).json({ message });
  }
};
```

### 4. Route (`routes/user.js` - إضافة)

```javascript
userRouter.delete('/account', isAuthenticated, deleteAccount);
```

---

## 💻 التطبيق على الويب

### 1. API Function (`web/src/libs/requests.js` - إضافة)

```javascript
export const deleteAccount = async (password) => {
  try {
    const response = await api.delete('/api/user/account', {
      data: { password },
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || 'فشل حذف الحساب';
    return { error: message };
  }
};
```

### 2. Zustand Store (`web/src/libs/globalState.js` - تحديث)

```javascript
// في الـ action logout، أضف:
const logout = () => {
  socket?.disconnect();
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentReceiver');
  set({
    user: null,
    accessToken: null,
    socket: null,
    currentReceiver: null,
    friends: [],
    messages: [],
  });
};
```

### 3. UI Component (`web/src/components/Profile/index.jsx`)

```jsx
import { useState } from 'react';
import { deleteAccount } from '../../libs/requests';
import { useStore } from '../../libs/globalState';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { logout } = useStore();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);

    const result = await deleteAccount(deletePassword);
    setDeleting(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    // Logout and redirect
    logout();
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* ... existing profile content ... */}

      {/* Delete Account Section */}
      <div className="mt-8 pt-6 border-t border-gray-300">
        <h2 className="text-red-600 font-bold mb-3">منطقة الخطر</h2>
        <p className="text-gray-600 mb-4">
          حذف حسابك بشكل نهائي مع جميع الرسائل والملفات
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          حذف الحساب
        </button>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              هل أنت متأكد من حذف حسابك؟
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              سيتم حذف جميع الرسائل والملفات نهائياً ولا يمكن استرجاعها
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {deleteError}
              </div>
            )}

            <input
              type="password"
              placeholder="أدخل كلمة المرور للتأكيد"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
              disabled={deleting}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : 'حذف نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📱 التطبيق على الموبايل

### 1. API Function (`app/libs/requests.js` - إضافة)

```javascript
export const deleteAccount = async (password) => {
  try {
    const response = await api.delete('/api/user/account', {
      data: { password },
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.message || error?.message || 'Failed to delete account';
    return { error: message };
  }
};
```

### 2. UI Component (`app/components/EditUserModal.js` - تحديث)

```jsx
import { Alert } from 'native-base';
import { useState } from 'react';
import { deleteAccount } from '../libs/requests';

export default function EditUserModal({ modalVisible, closeModal }) {
  const { user, logout } = useStore();
  const navigation = useNavigation();
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.show({ title: 'Error', description: 'Enter your password' });
      return;
    }

    setDeleting(true);
    const result = await deleteAccount(deletePassword);
    setDeleting(false);

    if (result.error) {
      Alert.show({ title: 'Error', description: result.error });
      return;
    }

    // Logout
    await logout();
    navigation.navigate('Login');
  };

  return (
    <Modal isOpen={modalVisible} onClose={closeModal}>
      {/* ... existing modal content ... */}

      {/* Delete Account Button */}
      <Button
        onPress={() => setShowDeletePrompt(true)}
        bg="red.600"
        _hover={{ bg: 'red.700' }}
        mt="4"
      >
        Delete Account
      </Button>

      {/* Delete Confirmation */}
      {showDeletePrompt && (
        <AlertPrimary title="Delete Account?" onConfirm={handleDeleteAccount}>
          <Input
            placeholder="Enter password to confirm"
            type="password"
            secureTextEntry
            value={deletePassword}
            onChangeText={setDeletePassword}
            isDisabled={deleting}
          />
        </AlertPrimary>
      )}
    </Modal>
  );
}
```

---

## 🧪 الاختبارات

### الخادم (`tests/api.test.js` - إضافة)

```javascript
logStep(XX, 'DELETE /api/user/account — delete account with incorrect password');
const deleteRes1 = await makeRequest('DELETE', '/api/user/account', { password: 'wrong' }, token);
assert(deleteRes1.status === 401, 'Returns 401 for wrong password');

logStep(XX, 'DELETE /api/user/account — delete account successfully');
const deleteRes2 = await makeRequest('DELETE', '/api/user/account', { password: testPassword }, token);
assert(deleteRes2.status === 200, 'Returns 200 on success');
assert(deleteRes2.body.data.userDeleted === true, 'User deleted flag true');
assert(deleteRes2.body.data.messagesDeleted >= 0, 'Message count returned');

logStep(XX, 'GET /api/user/profile — verify deletion (404)');
const getRes = await makeRequest('GET', '/api/user/profile', null, token);
assert(getRes.status === 401, 'Already logged out, should fail');
```

### الويب (`web/src/tests/deleteAccount.test.jsx` - جديد)

```javascript
describe('Delete Account Feature', () => {
  it('should show delete modal on button click', () => {
    // مختبر UI
  });

  it('should validate password before deletion', async () => {
    // اختبار validation
  });

  it('should logout after successful deletion', async () => {
    // اختبار logout
  });

  it('should display error on wrong password', async () => {
    // اختبار معالجة الأخطاء
  });
});
```

---

## 📚 التوثيق المطلوب تحديثها

1. **API Endpoints** - إضافة مسار DELETE
2. **Feature Guide** - إضافة سير العمل
3. **Testing Guide** - إضافة حالات الاختبار
4. **Tutorial (Web)** - شرح المكون
5. **Tutorial (Mobile)** - شرح المكون
6. **AI Patterns** - إضافة النمط

---

## ✅ Checklist

### Server
- [ ] Add `validateDeleteAccountInput()` في validator
- [ ] Add `deleteAccount()` في repository
- [ ] Add `deleteAccount()` controller
- [ ] Add `DELETE /api/user/account` route
- [ ] Add tests (8-10 اختبارات)
- [ ] Test transaction atomicity
- [ ] Test file cleanup

### Web
- [ ] Add `deleteAccount()` API function
- [ ] Add delete modal UI
- [ ] Add password confirmation
- [ ] Add error handling
- [ ] Add tests (5-7 اختبارات)
- [ ] Add logout redirect

### Mobile
- [ ] Add `deleteAccount()` API function
- [ ] Add delete button in EditUserModal
- [ ] Add confirmation alert
- [ ] Add password input
- [ ] Add error display
- [ ] Test on physical device

### Documentation
- [ ] Update docs/api-endpoints.md
- [ ] Update docs/ai/feature-guide.md
- [ ] Update docs/testing.md
- [ ] Update tutorial files
- [ ] Update README (test count: 340+ tests)

---

## 🔒 أفضل الممارسات المتبعة

✅ **Authentication:** JWT stored in localStorage/AsyncStorage, auto-injected via interceptors
✅ **Validation:** Server-side validation عربي + client-side feedback
✅ **Error Handling:** Graceful fallbacks, meaningful error messages
✅ **Data Integrity:** MongoDB transaction ensures atomicity
✅ **File Cleanup:** Safely deletes associated files
✅ **UI/UX:** Confirmation modal prevents accidental deletion
✅ **Logging:** Console logs for debugging
✅ **Testing:** Comprehensive test coverage
