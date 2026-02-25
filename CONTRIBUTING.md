# دليل المساهمة — محادثتي (project-chatapp-e1)

> **اقرأ هذا الملف قبل إجراء أي تغيير.**
> هذه القواعد غير قابلة للتفاوض وتُطبَّق عند مراجعة الكود. أي انحراف يتطلب مبرراً صريحاً.

---

## 1. المعمارية أولاً

قبل كتابة أي كود، اقرأ توثيق توجيهات AI:

| الملف | اقرأه عند |
|-------|---------|
| [`docs/ai/README.md`](docs/ai/README.md) | دائماً — ابدأ من هنا |
| [`docs/ai/architecture.md`](docs/ai/architecture.md) | إجراء أي تغيير في الخادم أو العميل |
| [`docs/ai/feature-guide.md`](docs/ai/feature-guide.md) | إضافة كيان أو ميزة جديدة |

**ملخص القواعد الحرجة (القائمة الكاملة في `docs/ai/README.md`):**
- لا تستورد نموذج Mongoose مباشرة في المتحكم — استخدم `getRepositoryManager()`
- ترتيب middleware ثابت: `isAuthenticated` → `upload` → المحققون → المتحكم
- المحققون يستخدمون دوالّ مخصصة برسائل خطأ عربية — لا تضع التحقق داخل المتحكمات
- رمز المصادقة عبر Zustand store — لا `localStorage` (ويب) ولا `AsyncStorage` خام (جوال)
- التخزين عبر `getStorageService()` — لا تنشئ `StorageService` مباشرة
- طلبات HTTP عبر `api` (axios instance) — لا `fetch` أو `axios` خاماً
- أحداث Socket.IO يجب أن تكون مقيّدة (typing بالمرسل، seen ثنائي الاتجاه)

---

## 2. أسماء الفروع

```
main             ← كود جاهز للإنتاج فقط؛ لا تُودِع مباشرة
feat/<topic>     ← ميزة جديدة (مثال: feat/group-chat)
fix/<topic>      ← إصلاح خطأ (مثال: fix/typing-indicator-scope)
docs/<topic>     ← توثيق فقط (مثال: docs/update-ai-guide)
chore/<topic>    ← أدوات، اعتماديات، إعداد (مثال: chore/add-prettier)
refactor/<topic> ← إعادة هيكلة بدون تغيير في السلوك
```

---

## 3. رسائل الإيداع (Commit Messages)

**الصيغة:** [Conventional Commits](https://www.conventionalcommits.org/) — **بالإنجليزية فقط**.

```
<type>(<scope>): <short description>

<body — list of changes, one per line starting with ->

<footer — breaking changes or issue references>
```

### الأنواع (Types)

| النوع | متى تستخدمه |
|-------|------------|
| `feat` | ميزة أو سلوك جديد |
| `fix` | إصلاح خطأ |
| `docs` | تغييرات في التوثيق فقط |
| `test` | إضافة أو تحديث اختبارات |
| `refactor` | إعادة هيكلة بدون تغيير في السلوك |
| `chore` | أدوات، إعداد، اعتماديات، CI |
| `style` | تنسيق فقط (بدون تغيير منطقي) |

### النطاقات (Scopes)

| النطاق | ينطبق على |
|--------|----------|
| `server` | مجلد `server/` |
| `app` | مجلد `app/` (React Native جوال) |
| `web` | مجلد `web/` (React CRA ويب) |
| `docs` | مجلد `docs/` |
| `ai` | `docs/ai/` تحديداً |
| `ci` | `.github/workflows/` |

### قواعد الإيداع

1. **سطر الموضوع ≤ 72 حرفاً**
2. **الموضوع يستخدم صيغة الأمر** — "add"، "fix"، "update"، ليس "added"، "fixed"
3. **لا نقطة في نهاية سطر الموضوع**
4. **النص الأساسي إلزامي للإيداعات غير التافهة** — اذكر كل تغيير مهم
5. **افصل الموضوع عن النص بسطر فارغ**
6. **تغيير منطقي واحد لكل إيداع** — لا تخلط server + app + web + docs في إيداع واحد

### أمثلة

```bash
# ✅ صحيح
git commit -m "feat(server): add group chat with repository + validators

- Add Group Mongoose model with members array
- Register in models and add GroupRepository extending BaseRepository
- Register in RepositoryManager as getGroupRepository()
- Add group validators with Arabic error messages
- Add group routes with correct middleware order
- Socket.IO: add group_message event handling"

# ✅ صحيح (patch)
git commit -m "fix(web): use api axios instance in GroupService

- Replace raw axios.post() with api.post() to ensure token injection"

# ✅ صحيح (توثيق فقط)
git commit -m "docs(ai): update architecture with group chat layer"

# ❌ خاطئ — موضوع عربي
git commit -m "إضافة المجموعات"

# ❌ خاطئ — نطاق مختلط
git commit -m "feat: add groups server and web and app"

# ❌ خاطئ — لا نص في إيداع غير تافه
git commit -m "feat(server): add repository pattern"

# ❌ خاطئ — صيغة الماضي
git commit -m "feat(server): added group endpoint"
```

---

## 4. استراتيجية التاجات (Tagging Strategy)

تُحدِّد التاجات **معالم الإصدار المهمة** — ليس كل إيداع.

### متى تنشئ تاجاً

| رفع الإصدار | المحفّز |
|------------|---------|
| `v1.0.0` (major) | أول إصدار جاهز للإنتاج، أو تغيير جذري (breaking change) |
| `v1.X.0` (minor) | ميزة جديدة مكتملة مع الاختبارات |
| `v1.X.Y` (patch) | إصلاح توثيق، إصلاح خطأ، تصحيح ثانوي |

**لا تضع تاجاً أبداً على:**
- إيداعات في منتصف العمل (work-in-progress)
- إيداعات بها اختبارات فاشلة
- إيداعات من نوع "Finished: X page"
- كل إيداع في فرع الميزة

### صيغة التاج — annotated tags حصراً

```bash
# تاج موصوف (استخدم دائماً -a — لا lightweight tags)
git tag -a v1.2.0 -m "v1.2.0 - Add Group Chat System

- Group model + GroupRepository (Mongoose/MongoDB)
- REST routes: POST /groups, GET /groups, DELETE /groups/:id
- Custom validators: name required, members array min 2
- Socket.IO: group_message, group_typing events
- Client: GroupList + GroupChat components
- Server tests: 232 → 280 passing
- Web tests: 99 passing
- Mobile tests: 83 passing"

# تاج على إيداع سابق
git tag -a v1.0.0 <hash> -m "v1.0.0 - ..."

# رفع التاج إلى GitHub
git push origin v1.2.0
```

### قواعد رسالة التاج

1. **السطر الأول:** `vX.Y.Z - عنوان بشري واضح`
2. **النص:** قائمة بأهم التغييرات
3. **اذكر أعداد الاختبارات** عند تغييرها (قبل → بعد)
4. **بالإنجليزية فقط**

---

## 5. تنسيق الكود

**جميع الكود منسّق بـ Prettier** قبل كل إيداع. لا قرارات مسافات يدوية.

```bash
# تنسيق جميع الملفات (من جذر المشروع — يعمل على جميع الأنظمة)
node format.mjs

# التحقق بدون كتابة (CI — يخرج 1 إذا كان غير منسّق)
node format.mjs --check

# أو لكل حزمة:
cd server && npm run format
cd app && npm run format
cd web && npm run format
```

**إعداد Prettier** (`.prettierrc.json` في `server/`، `app/`، و`web/`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**القواعد:**
- مسافة بادئة 2 فراغ — دائماً، لا tabs
- علامات اقتباس مفردة للسلاسل النصية
- فواصل trailing في الهياكل متعددة الأسطر (متوافق مع ES5)
- أقصى عرض للسطر: 100 حرف
- لا تُعدِّل المسافات يدوياً — دع Prettier يقرر

---

## 6. قائمة التحقق قبل الإيداع

شغّل هذا قبل كل `git commit`:

```bash
# 1. جميع اختبارات الخادم (270 اختباراً)
cd server && npm run test:all

# 2. جميع اختبارات الويب (99 اختباراً)
cd web && npm run test:ci

# 3. جميع اختبارات الجوال (83 اختباراً)
cd app && npm run test:ci

# 4. Prettier — تأكد من تطبيق التنسيق
node format.mjs --check
```

**يجب أن ينجح كل ما سبق قبل الإيداع.** إيداع بفشل اختبارات أو كود غير منسّق يجب ألا يصل إلى `main`.

---

## 7. تحديثات التوثيق

عند إضافة ميزة أو تغييرها:

| نوع التغيير | تحديثات التوثيق المطلوبة |
|------------|------------------------|
| كيان جديد (model + repo + controller) | `docs/ai/feature-guide.md`، `docs/ai/architecture.md`، `docs/api-endpoints.md` |
| نقطة نهاية REST جديدة | `docs/api-endpoints.md`، `docs/ai/README.md` (جدول API) |
| متغير بيئة جديد | `docs/ai/README.md` (قسم المتغيرات)، `README.md` |
| ملف اختبار جديد | `docs/testing.md` |
| مزود تخزين جديد | `docs/storage.md`، `docs/ai/architecture.md` |
| تغيير في المصادقة | `docs/ai/architecture.md` (قسم المصادقة) |
| حدث Socket.IO جديد | `docs/ai/architecture.md`، `docs/api-endpoints.md` |
| مكوّن ويب أو جوال جديد | `docs/ai/feature-guide.md` |

**إيداعات التوثيق يجب أن تكون منفصلة عن إيداعات الكود** (استخدم النوع `docs`).

---

## 8. متطلبات الاختبار

| مجموعة الاختبار | الأمر | العدد | يجب أن تنجح قبل |
|----------------|-------|-------|----------------|
| الخادم الشامل | `cd server && npm test` | 80 | أي إيداع على الخادم |
| repositories الخادم | `cd server && npm run test:repos` | 44 | أي إيداع على الخادم |
| التكامل | `cd server && npm run test:integration` | 45 | أي إيداع على الخادم |
| E2E API | `cd server && npm run test:e2e` | 63 | أي إيداع على الخادم |
| الصور | `cd server && npm run test:image` | 38 | أي إيداع للتخزين |
| اختبارات الويب | `cd web && npm run test:ci` | 99 | أي إيداع على الويب |
| اختبارات الجوال | `cd app && npm run test:ci` | 83 | أي إيداع على الجوال |
| **الإجمالي** | — | **452** | أي تاج إصدار |

راجع [`docs/testing.md`](docs/testing.md) للتوثيق الكامل للاختبارات.
