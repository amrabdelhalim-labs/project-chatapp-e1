# مرجع سريع للمستودعات

## الاستيراد

```javascript
import { getRepositoryManager } from './repositories/index.js';
const repos = getRepositoryManager();
```

---

## المستخدمون

```javascript
// إنشاء
const user = await repos.user.createUser({ firstName, lastName, email, password, profilePicture });

// بحث
const user = await repos.user.findByEmail('ahmed@example.com');
const user = await repos.user.findByIdSafe(userId);        // بدون كلمة المرور
const users = await repos.user.findAllExcept(currentUserId); // الكل ماعدا الحالي
const exists = await repos.user.emailExists('ahmed@example.com');

// تحديث
const user = await repos.user.updateProfile(userId, { firstName, lastName, status });
const { previousPicture, user } = await repos.user.updateProfilePicture(userId, newUrl);
```

---

## الرسائل

```javascript
// إنشاء
const msg = await repos.message.create({ sender, recipient, content });

// بحث
const messages = await repos.message.findAllForUser(userId);
const paginated = await repos.message.findAllForUserPaginated(userId, page, limit);
// → { rows, count, page, totalPages }
const conversation = await repos.message.findConversation(userId1, userId2);

// تحديث
const modified = await repos.message.markAsSeen(senderId, recipientId);

// إحصاء
const count = await repos.message.countUnseen(senderId, recipientId);
const total = await repos.message.countAllUnseen(recipientId);

// حذف
await repos.message.deleteConversation(userId1, userId2);
await repos.message.deleteByUser(userId);
```

---

## التخزين

```javascript
import { getStorageService } from '../services/storage/storage.service.js';
const storage = getStorageService();

const result = await storage.uploadFile(req.file);  // { url, filename }
await storage.deleteFile(oldUrl);                    // boolean
const url = storage.getFileUrl('image.jpg');          // string
const ok = await storage.healthCheck();               // boolean
```

---

## طرق المستودع الأساسي (متاحة لجميع المستودعات)

```javascript
await repos.user.findAll(filter, options);
await repos.user.findOne(filter, options);
await repos.user.findById(id, options);
await repos.user.findPaginated(page, limit, filter, options);
await repos.user.create(data);
await repos.user.update(id, data);
await repos.user.updateMany(filter, data);
await repos.user.delete(id);
await repos.user.deleteMany(filter);
await repos.user.exists(filter);
await repos.user.count(filter);
```
