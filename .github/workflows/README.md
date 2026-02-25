# CI/CD — Build & Deploy

## كيف يعمل الـ Workflow

يعمل تلقائياً عند كل `push` إلى `main`، أو يدوياً عبر **Actions → Run workflow**.

### الوظائف (Jobs)

| Job | ما يفعل |
|-----|---------|
| **Deploy Server** | تثبيت التبعيات → تشغيل 232 اختبار (MongoDB service) → نشر إلى فرع `server` |
| **Deploy Web** | تثبيت التبعيات → تشغيل 99 اختبار → بناء React → نشر إلى فرع `web` |

الوظيفتان تعملان **بالتوازي** — لا تعتمد إحداهما على الأخرى.

---

## المتغيرات المطلوبة (GitHub Repository Variables)

اذهب إلى **Settings → Secrets and variables → Actions → Variables** وأضف:

| Variable | مثال | الوصف |
|----------|------|-------|
| `REACT_APP_API_URL` | `https://your-server.onrender.com` | عنوان الخادم الذي يتصل به العميل |

> **ملاحظة:** `REACT_APP_API_URL` هو **Variable** وليس **Secret** لأنه يظهر في الكود المبني.

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

| المشكلة | الحل |
|---------|------|
| فشل اختبارات الخادم | تأكد أن MongoDB service يعمل (تحقق من الـ logs) |
| فشل بناء الويب | تأكد من إضافة `REACT_APP_API_URL` في Variables |
| لم يُنشر شيء | تأكد أن الـ push على فرع `main` وليس فرع آخر |
| `[skip ci]` في الإيداع | إيداعات النشر تتجاهل تشغيل الـ workflow مرة أخرى |
