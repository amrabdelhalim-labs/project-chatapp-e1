# AI Guidance — My Chat (محادثتي)

This directory contains machine-facing documentation for AI assistants working on this project.

## Files

| File | Purpose |
|------|---------|
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | Branch naming, commit format, tagging, formatting, pre-commit checklist |
| [architecture.md](architecture.md) | System architecture (server + web), tech stack, data flow |
| [feature-guide.md](feature-guide.md) | Feature implementation patterns, Socket.IO events, storage, state management |

## Quick Context

- **Name:** My Chat (محادثتي)
- **Type:** Real-time chat application (1:1 messaging)
- **Structure:** 3 packages — `server/` (Express + MongoDB + Socket.IO), `web/` (React CRA), `app/` (Expo + React Native)
- **Language:** JavaScript (ES Modules on server, JSX on clients)
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT with 7-day expiry
- **Real-time:** Socket.IO for messaging, typing indicators (scoped), bidirectional read receipts
- **Storage:** Strategy Pattern (local/Cloudinary/S3) via `STORAGE_TYPE` env var
- **Web Client:** React 19 + Zustand + Axios interceptors + Formik/Yup + Tailwind CSS
- **Server Testing:** Custom runner, 323 server tests (6 test suites)
- **Web Testing:** Jest + Testing Library, 99 web tests (5 test suites)
- **Mobile Testing:** Jest 29 + jest-expo 54, 83 mobile tests (4 test suites)
- **Total Tests:** 505 (323 server + 99 web + 83 mobile)
- **Deployment:** Heroku-ready with Procfile
- **CI/CD:** GitHub Actions — server tests (MongoDB service) + web tests/build → deploy to orphan branches
- **Formatting:** Prettier with LF normalization (`.prettierrc.json` in each package, `format.mjs` at root)
- **Contributing:** `CONTRIBUTING.md` at project root — commit format, tagging, pre-commit checklist
- **Tutorials:** 9 server tutorials + 5 web tutorials + 5 mobile tutorials (Arabic) in `docs/tutorials/`

## Test Commands

### Server (custom test runner — requires MongoDB)
```bash
cd server
npm run test:all         # all 323 tests (6 files sequentially)
npm test                 # comprehensive.test.js (80 tests)
npm run test:repos       # repositories.test.js (44 tests)
npm run test:integration # integration.test.js (46 tests)
npm run test:e2e         # api.test.js (65 tests — port 5001)
npm run test:image       # image.test.js (38 tests — upload/replace/delete lifecycle)
npm run test:storage     # storage.test.js (50 tests — unit tests for storage strategies)
npm run check-default-picture  # verify/upload default profile picture (setup tool)
```

### Web (Jest + @testing-library/react)
```bash
cd web
npm test                 # watch mode (development)
npm run test:ci          # single run (CI/servers)
# 99 tests across 5 suites — all pass
```

### Mobile (Jest 29 + jest-expo 54)
```bash
cd app
npm test                 # watch mode (development)
npm run test:ci          # single run (CI/servers)
npx jest --watchAll=false --verbose  # verbose output
# 83 tests across 4 suites — all pass
```

### Formatting (Prettier — all packages)
```bash
# From project root — format all source files
node format.mjs

# Check only (CI — exit 1 if unformatted)
node format.mjs --check

# Per-package
cd server && npm run format
cd app && npm run format
cd web && npm run format

# Check per-package
cd server && npm run format:check
cd app && npm run format:check
cd web && npm run format:check
```

## Environment Variables

| Variable | Package | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| PORT | server | No | 5000 | Server port |
| MONGODB_URL | server | Yes | — | MongoDB connection string |
| JWT_SECRET | server | Yes | — | JWT signing secret (validated at startup) |
| STORAGE_TYPE | server | No | local | Storage backend (local/cloudinary/s3) |
| DEFAULT_PROFILE_PICTURE_URL | server | Cloud only | — | Pre-uploaded default picture URL (cloudinary/s3) |
| CLOUDINARY_URL | server | If cloudinary | — | cloudinary://API_KEY:API_SECRET@CLOUD_NAME |
| REACT_APP_API_URL | web | No | — | Server URL for Axios |
| API_URL | app | Yes | — | Server URL via `@env` (react-native-dotenv) |

## Critical Rules

- Controllers never import models directly — use `getRepositoryManager()`
- Web components use `useParams()` for route params, never `pathname.slice()`
- Chat content rendered via `whitespace-pre-wrap` text, never `dangerouslySetInnerHTML`
- Typing state stores `senderId` (scoped), not a boolean
- `seen` event is bidirectional: `{ readerId, senderId }`
- Axios interceptor auto-injects Bearer token + redirects on 401 (both web and mobile)
- `safeParse()`/`safeGet()` wrappers guard localStorage from corrupt values (web)
- `addMessage()` deduplicates by `_id` then `clientId` (optimistic updates)
- Mobile uses `axios.create()` instance (not `axios.defaults.baseURL`)
- Mobile `logout()` clears both AsyncStorage and Zustand store
- Mobile babel plugins (dotenv + reanimated) excluded in test env
- Mobile must use Jest 29 (not 30) — jest-expo 54 incompatibility
- All code must be formatted with Prettier before commit (`node format.mjs`)
- Line endings are always LF — enforced by `.gitattributes` and Prettier `endOfLine: "lf"`
- Never mix formatting commits with feature commits — use `chore(format)` or `style` type
- Follow `CONTRIBUTING.md` for commit messages (Conventional Commits, English only)
- CI/CD runs on push to main — validate workflow changes locally before pushing (see `docs/testing.md`)
- Workflow `if:` conditions exclude PRs — deploy jobs run only on push + workflow_dispatch
- Deploy commits use `[skip ci]` suffix to prevent infinite loops
