# 🐳 شرح Docker Delivery الموحد

هذا الدليل يشرح المنطق الجديد لتوصيل صور Docker عبر سكريبت واحد:
`docker-delivery.mjs`.

## لماذا هذا مهم؟

بدلاً من تكرار أوامر Docker في أكثر من Workflow:
- أصبح لدينا **نقطة تشغيل واحدة** للبناء/الفحص/النشر.
- نفس المنطق يعمل محلياً وداخل GitHub Actions.
- أي تعديل مستقبلي يتم مرة واحدة فقط.

## المكونات المرتبطة

- `docker-delivery.mjs`: منطق build/scan/publish
- `check-docker-config.mjs`: فحص بنية Docker لـ server/web
- `check-docker-mobile-config.mjs`: فحص بنية Docker لـ mobile
- `.github/workflows/docker-delivery.yml`: تشغيل يدوي موحد لكل targets

## طريقة التشغيل اليدوي

### 1) Build فقط لـ server + web
```bash
node docker-delivery.mjs \
  --targets server,web \
  --mode build-only \
  --web-api-url http://localhost:5000
```

### 2) Build فقط لـ mobile
```bash
node docker-delivery.mjs \
  --targets mobile \
  --mode build-only \
  --mobile-api-url http://localhost:5000
```

### 3) Publish إلى GHCR
```bash
node docker-delivery.mjs \
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
- `--web-api-url`: يمرر `REACT_APP_API_URL` لبناء الويب
- `--public-url`: يمرر `PUBLIC_URL` لبناء الويب
- `--mobile-api-url`: يحدد `API_URL` داخل صورة الموبايل
- `--skip-trivy`: لتجاوز الفحص مؤقتاً أثناء التطوير المحلي
- `--skip-validate`: لتجاوز config-as-test (غير موصى به عادة)

## كيف يعمل الفحص الأمني؟

الفحص يتم عبر Trivy container، ويستخدم ملف:
`trivy/trivyignore.yaml`

هذا يضمن:
- توحيد مستوى الفحص بين local و CI.
- منع drift في سياسات تجاهل الثغرات.

## ممارسات موصى بها

- استخدم `build-only` أولاً، ثم `publish` بعد النجاح.
- لا تستخدم `--skip-trivy` في مسار النشر الفعلي.
- ثبّت المتغيرات عبر المدخلات (`web_api_url`, `mobile_api_url`) بدل hardcode.
- قبل النشر، شغّل:
  - `node check-docker-config.mjs`
  - `node check-docker-mobile-config.mjs`
  - `node format.mjs --check`

