# 🐳 شرح Docker Delivery الموحد

هذا الدليل يشرح المنطق الجديد لتوصيل صور Docker عبر سكريبت واحد:
`scripts/docker/docker-delivery.mjs`.

## لماذا هذا مهم؟

بدلاً من تكرار أوامر Docker في أكثر من Workflow:
- أصبح لدينا **نقطة تشغيل واحدة** للبناء/الفحص/النشر.
- نفس المنطق يعمل محلياً وداخل GitHub Actions.
- أي تعديل مستقبلي يتم مرة واحدة فقط.

## الفكرة ببساطة (Runtime Config Build)

الصور الخاصة بالويب والموبايل أصبحت تعمل بهذا النمط:
- **وقت بناء الصورة (`docker build`)**: تثبيت كل الحزم ونسخ الكود داخل الصورة فقط.
- **وقت تشغيل الصورة (`docker run`)**: قراءة متغيرات البيئة (مثل `REACT_APP_API_URL` أو `API_URL`) ثم تنفيذ build/export داخل الحاوية بدون تنزيل حزم جديدة.

بهذا الشكل:
- الصورة غير مرتبطة بعنوان API ثابت.
- نفس الصورة يمكن تشغيلها على أكثر من بيئة، مع تغيير المتغيرات فقط.
- زمن الإقلاع يزيد قليلًا لأن البناء يتم عند التشغيل، لكنه يعطي مرونة أعلى.

## المكونات المرتبطة

- `scripts/docker/docker-delivery.mjs`: منطق build/scan/publish
- `scripts/docker/check-docker-config.mjs`: فحص بنية Docker لـ server/web
- `scripts/docker/check-docker-mobile-config.mjs`: فحص بنية Docker لـ mobile
- `.github/workflows/docker-delivery.yml`: تشغيل يدوي موحد لكل targets

## طريقة التشغيل اليدوي

### 1) Build فقط لـ server + web
```bash
node scripts/docker/docker-delivery.mjs \
  --targets server,web \
  --mode build-only
```

> يمكنك ضبط defaults وقت البناء عبر `--web-api-url` و`--public-url` و`--mobile-api-url`. وعند التشغيل، أي متغير runtime (`docker run -e`) يتفوق على هذه defaults.

### 2) Build فقط لـ mobile
```bash
node scripts/docker/docker-delivery.mjs \
  --targets mobile \
  --mode build-only
```

### 3) Publish إلى GHCR
```bash
node scripts/docker/docker-delivery.mjs \
  --targets server,web,mobile \
  --mode publish \
  --gh-owner your-github-username \
  --gh-actor your-github-actor \
  --ghcr-token "$GITHUB_TOKEN" \
  --version v1.0.0
```

## أهم الخيارات

- `--targets`: `server`, `web`, `mobile` أو أي تركيبة بينهم
- `--mode`: `build-only` أو `publish`
- `--web-api-url`: القيمة الافتراضية المخبوزة داخل صورة الويب لـ `REACT_APP_API_URL`
- `--public-url`: القيمة الافتراضية المخبوزة داخل صورة الويب لـ `PUBLIC_URL`
- `--mobile-api-url`: القيمة الافتراضية المخبوزة داخل صورة الموبايل لـ `API_URL`
- `--skip-trivy`: لتجاوز الفحص مؤقتاً أثناء التطوير المحلي
- `--skip-validate`: لتجاوز config-as-test (غير موصى به عادة)
- `--trivy-exit-code`: كود فشل Trivy (الافتراضي: `0` في `build-only` و`1` في `publish`)

**تشغيل الصور:** مرّر `REACT_APP_API_URL` و`PUBLIC_URL` (ويب) أو `API_URL` (موبايل web export) عبر `docker run -e` أو متغيرات `docker-compose` — انظر `.env.docker.example`.

## أمثلة تشغيل مباشرة بعد البناء

### Web
```bash
docker run --rm -it \
  -p 3000:8080 \
  -e REACT_APP_API_URL=http://localhost:5000 \
  -e PUBLIC_URL=/ \
  chatapp-web:latest
```

### Mobile (Expo web export + nginx)
```bash
docker run --rm -it \
  -p 8080:8080 \
  -e API_URL=http://localhost:5000 \
  chatapp-mobile:latest
```

## كيف يعمل الفحص الأمني؟

الفحص يتم عبر Trivy container، ويستخدم ملف:
`trivy/trivyignore.yaml`

هذا يضمن:
- توحيد مستوى الفحص بين local و CI.
- منع drift في سياسات تجاهل الثغرات.

### سلوك الفحص حسب الوضع

- `build-only`: الفحص للتقرير فقط افتراضياً (لا يكسر التنفيذ عند وجود ثغرات).
- `publish`: الفحص بوابة منع افتراضياً (يفشل قبل `push` إذا وُجدت ثغرات ضمن مستوى الشدة المحدد).
- إذا أردت تشديد `build-only`، استخدم `--trivy-exit-code 1`.

## ممارسات موصى بها

- استخدم `build-only` أولاً، ثم `publish` بعد النجاح.
- لا تستخدم `--skip-trivy` في مسار النشر الفعلي.
- ثبّت متغيرات التشغيل عبر Compose أو `docker run -e` بدل hardcode داخل الصورة.
- قبل النشر، شغّل:
  - `node scripts/docker/check-docker-config.mjs`
  - `node scripts/docker/check-docker-mobile-config.mjs`
  - `node format.mjs --check`

