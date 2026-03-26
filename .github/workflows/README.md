# CI/CD — Build & Deploy

## كيف يعمل الـ Workflow

يعمل تلقائياً عند كل `push` إلى `main` لخط نشر الفروع (`server`/`web`)، بينما تشغيل Docker يتم يدوياً فقط عبر **Actions → Run workflow**.

### الوظائف (Jobs)

| Job | ما يفعل |
|-----|---------|
| **Deploy Server** | تثبيت التبعيات → تشغيل 232 اختبار (MongoDB service) → نشر إلى فرع `server` |
| **Deploy Web** | تثبيت التبعيات → تشغيل 99 اختبار → بناء React → نشر إلى فرع `web` |
| **Docker Delivery** | `check-docker-config.mjs` + `docker-delivery.mjs` (build/scan/publish) → (اختياري) نشر على GHCR |
| **Docker Delivery (manual)** | `check-docker-config.mjs` + `check-docker-mobile-config.mjs` + `docker-delivery.mjs` (server/web/mobile build/scan/publish) |

الوظيفتان تعملان **بالتوازي** — لا تعتمد إحداهما على الأخرى.

---

## المتغيرات المطلوبة (GitHub Repository Variables)

اذهب إلى **Settings → Secrets and variables → Actions → Variables** وأضف:

| Variable | مثال | الوصف |
|----------|------|-------|
| `REACT_APP_API_URL` | `https://your-server.onrender.com` | عنوان الخادم الذي يتصل به العميل |

> **ملاحظة:** `REACT_APP_API_URL` هو **Variable** وليس **Secret** لأنه يظهر في الكود المبني.

### متغيرات البناء الديناميكية

| Variable | القيمة في CI/CD | الوصف |
|----------|----------------|-------|
| `PUBLIC_URL` | `/project-chatapp-e1` | المسار الفرعي على GitHub Pages (يتم تعيينه تلقائياً في workflow) |

**للنشر على منصات أخرى (Netlify/Vercel/etc):**
- لا تحتاج `PUBLIC_URL` — التطبيق يعمل من المسار الجذر `/` تلقائياً
- فقط تأكد من تعيين `REACT_APP_API_URL` على المنصة المختارة

---

## النشر

### Server (فرع `server`)
- يُنشر كود الخادم كما هو (JavaScript، بدون بناء)
- يُحذف: اختبارات، devDependencies، سكريبتات التطوير
- يُضاف `Procfile` تلقائياً: `web: node index.js`
- متوافق مع: **Render**, **Railway**, **Heroku**

### Web (فرع `web`)
- يُبنى بـ `react-scripts build`
- يُنشر محتوى `web/build/` إلى فرع `web`
- يُضاف `.nojekyll` لـ GitHub Pages
- متوافق مع: **GitHub Pages**, **Netlify**, **Vercel**

---

## إعداد GitHub Pages

1. اذهب إلى **Settings → Pages**
2. اختر **Source: Deploy from a branch**
3. اختر فرع `web` ومجلد `/ (root)`
4. احفظ — سيُنشر الموقع تلقائياً

---

## التشغيل المحلي

### Server
```bash
cd server
cp .env.example .env   # أنشئ ملف .env بالمتغيرات المطلوبة
npm install
npm run dev
```

### Web
```bash
cd web
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
npm install
npm start
```

---

## استكشاف الأخطاء

### أخطاء الخادم (Server)

| المشكلة | السبب | الحل |
|---------|------|------|
| `cp: unrecognized option '--exclude'` | استخدام `cp` بدلاً من `rsync` في Ubuntu | ✅ تم الإصلاح: نستخدم `rsync` الآن |
| فشل اختبارات MongoDB | MongoDB service لم يبدأ | تحقق من GitHub Actions logs — يجب أن يعرض `health-retries` |
| `node_modules` في فرع التوزيع | نسخ الملفات بدون استثناء | ✅ تم الإصلاح: استثناء `.gitignore` مُدرج البيانات |

### أخطاء الويب (Web)

| المشكلة | السبب | الحل |
|---------|------|------|
| `Failed to load resource: 404` في GitHub Pages | ملفات الـ build لم تُنسخ | تحقق من `📦 Web deploy folder has X files` في logs |
| `yaml@2.8.2 from lock file` أثناء npm ci | تضارب الإصدارات | ✅ تم الإصلاح: أضفنا `yaml@^2.4.2` إلى devDependencies |
| `Manifest fetch failed, code 404` | `.nojekyll` لم يُنسخ أو مسار github pages خاطئ | تأكد من: 1) `.nojekyll` موجود 2) GitHub Pages مُعدّ على فرع `web` |
| بناء فارغ (عدد الملفات قليل جداً) | `npm run build` كُسّر | تحقق من خطأ البناء في CI logs — قد يكون `REACT_APP_API_URL` ناقصاً |

### فحوصات التشخيص

عند حدوث خطأ، ابحث عن البطاقات التالية في CI logs:

```text
📦 Web deploy folder has X files          # يجب أن يكون > 10 ملفات
📤 Copied X files to web branch           # يجب أن يساوي رقم الأول تقريباً
✅ Web build successful                   # دلالة النجاح
```

### ملاحظة مهمة حول الصور (Profile Pictures)

**الصور لا تظهر في GitHub Pages** لأن:
- صور الملفات الشخصية مُخزنة على **الخادم** (`server/public/uploads/`)
- GitHub Pages يخدم فقط **الواجهة الثابتة** (ملفات HTML/CSS/JS)
- الروابط النسبية `/uploads/pic.jpg` لا تعمل في GitHub Pages

**الحل:**
1. الصور تُستدعى من **الخادم** باستخدام `REACT_APP_API_URL` 
2. مثال: `https://api.example.com/uploads/pic.jpg` (الخادم الحقيقي)
3. في GitHub Pages المحلي: الخادم المحلي يخدم الصور (`http://localhost:5000/uploads/pic.jpg`)



---

## التشغيل المحلي

### Server
```bash
cd server
cp .env.example .env   # أنشئ ملف .env بالمتغيرات المطلوبة
npm install
npm run dev
```

### Web
```bash
cd web
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
npm install
npm start
```

---

### تشغيل Docker Delivery يدويًا

لتشغيل Workflow Docker الموحد (server/web/mobile):
- من GitHub افتح: **Actions → Docker Delivery**
- اضغط **Run workflow**
- اختر `targets` (مثل: `all` أو `mobile` أو `server,web`)
- اختر `docker_mode`:
  - `build-only` للتأكد من البوابة والفحص فقط
  - `publish` لدفع الصور إلى GHCR
- (اختياري) خصص:
  - `web_api_url`
  - `public_url`
  - `mobile_api_url`

---

## المشاكل الشائعة والحلول

| المشكلة | الحل |
|---------|------|
| فشل اختبارات الخادم | تأكد أن MongoDB service يعمل (تحقق من الـ logs) |
| فشل بناء الويب | تأكد من إضافة `REACT_APP_API_URL` في Variables |
| لم يُنشر شيء | تأكد أن الـ push على فرع `main` وليس فرع آخر |
| `[skip ci]` في الإيداع | إيداعات النشر تتجاهل تشغيل الـ workflow مرة أخرى |
