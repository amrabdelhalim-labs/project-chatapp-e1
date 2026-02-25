# My Chat - محادثتي

A **real-time chat application** with 1:1 messaging, typing indicators, read receipts, and profile management. Built as a multi-platform project with a shared Express server, a React web client, and an Expo/React Native mobile client.

> **الاسم العربي:** محادثتي | **الاسم الإنجليزي:** My Chat | **المشروع:** تعليمي

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based auth with bcrypt password hashing (7-day expiry) |
| 💬 **Real-time Chat** | Socket.IO for instant messaging between users |
| ✍️ **Typing Indicators** | Scoped per-sender — shows "typing..." only for the active conversation |
| ✅ **Read Receipts** | Bidirectional — both reader and sender see updated status |
| 👤 **Profiles** | Update name, status, upload/change profile picture |
| 📱 **Multi-Platform** | Web (React) + Mobile (Expo/React Native) + Shared Server |
| 🗄️ **Flexible Storage** | Pluggable architecture: Local, Cloudinary, or AWS S3 |
| 🧪 **Comprehensive Tests** | 414 tests across server, web, and mobile |
| 🎨 **Code Quality** | Prettier formatting + LF normalization + Contributing standards |

---

## 🏗️ Tech Stack

### Server (`server/`)

| Technology | Purpose | Version |
|-----------|---------|---------|
| Node.js | JavaScript runtime | 22.x |
| Express | Web framework | 4.x |
| MongoDB | NoSQL database | Latest |
| Mongoose | ODM with schema validation | 8.x |
| Socket.IO | Real-time bidirectional communication | 4.x |
| JWT | Stateless authentication | 9.x |
| bcrypt | Password hashing | 6.x |
| multer | File upload handling (memoryStorage) | 2.x |

### Web (`web/`)

| Technology | Purpose | Version |
|-----------|---------|---------|
| React | UI framework | 19.x |
| React Router | Client-side routing (Data Router) | 7.x |
| Zustand | State management | 5.x |
| Axios | HTTP client with interceptors | 1.x |
| Tailwind CSS | Utility-first CSS framework | 3.x |
| Formik + Yup | Form handling + validation | 2.x / 1.x |
| Socket.IO Client | Real-time events | 4.x |

### Mobile (`app/`)

| Technology | Purpose | Version |
|-----------|---------|---------|
| Expo | React Native framework | ~54 |
| React Native | Mobile UI framework | 0.81.x |
| React Navigation | Native navigation (Stack + Tab) | 7.x |
| Zustand | State management + AsyncStorage persistence | 5.x |
| Axios | HTTP client with interceptors | 1.x |
| NativeBase | Cross-platform UI components | 3.x |
| Formik + Yup | Form handling + validation | 2.x / 1.x |

---

## 📁 Project Structure

```
project-chatapp-e1/
├── .github/workflows/          # GitHub Actions CI/CD (server tests + web build & deploy)
├── .gitattributes              # LF line endings enforcement
├── .gitignore                  # node_modules, .expo, .env, coverage
├── CONTRIBUTING.md             # Branch naming, commits, tagging, formatting
├── format.mjs                  # Cross-platform Prettier runner
├── README.md                   # This file
│
├── server/                     # Express REST API + Socket.IO
│   ├── index.js                # Entry point: Express + Socket.IO setup
│   ├── config.js               # MongoDB connection + server startup
│   ├── controllers/            # Auth (user.js) + Messages (message.js)
│   ├── repositories/           # Repository Pattern (base, user, message, manager)
│   ├── validators/             # Input validation with Arabic error messages
│   ├── services/storage/       # Strategy Pattern (local, cloudinary, s3)
│   ├── middlewares/            # JWT auth + multer file upload
│   ├── models/                 # Mongoose schemas (User, Message)
│   ├── utils/                  # JWT helpers + Socket.IO utility
│   ├── routes/                 # /api/user/* + /api/message/*
│   ├── tests/                  # 232 tests (4 test suites)
│   └── Procfile                # Heroku deployment
│
├── web/                        # React CRA web client
│   └── src/
│       ├── pages/              # Home, Login, Register
│       ├── components/         # Chat, Sidebar, Profile, ProtectedRoute
│       ├── libs/               # Zustand store, Axios interceptors, message filter
│       └── tests/              # 99 tests (5 test suites)
│
├── app/                        # Expo + React Native mobile client
│   ├── screens/                # Login, Register, Home (chat, messages, profile)
│   ├── components/             # Header, EditUserModal, Chat sub-components
│   ├── libs/                   # Zustand store, Axios interceptors, message filter
│   └── tests/                  # 83 tests (4 test suites)
│
└── docs/                       # Documentation
    ├── ai/                     # AI guidance (architecture, feature-guide)
    ├── tutorials/              # Arabic tutorials (server, web, mobile)
    ├── api-endpoints.md        # REST + WebSocket reference
    ├── database-abstraction.md # Repository Pattern explanation
    ├── testing.md              # All test documentation
    └── ...                     # storage, deployment, quick-reference
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22.x or later
- **MongoDB** (local or Atlas)
- **npm** 9+

---

### 🔧 Server Setup

```bash
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URL, JWT secret, etc.

# Start development server
npm run dev
# — OR — production mode
npm start
```

Server runs on `http://localhost:5000` by default.

---

### 🌐 Web Setup

```bash
cd web
npm install

# Configure environment
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:5000

# Start development server
npm start
```

Web client runs on `http://localhost:3000`.

---

### 📱 Mobile Setup

```bash
cd app
npm install

# Configure environment
cp .env.example .env
# Set API_URL=http://localhost:5000

# Start Expo development server
npm start
```

---

## 🔐 Environment Variables

### Server (`server/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `MONGODB_URL` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `STORAGE_TYPE` | No | `local` | Storage backend: `local` \| `cloudinary` \| `s3` |

### Web (`web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | No | Server URL for Axios (e.g., `http://localhost:5000`) |

### Mobile (`app/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | **Yes** | Server URL via `@env` (e.g., `http://localhost:5000`) |

---

## 📡 API Reference

### Authentication

All endpoints require `Authorization: Bearer <token>` except Login/Register.

#### Users (`/api/user`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/register` | Public | Create new account |
| `POST` | `/login` | Public | Get JWT token |
| `GET` | `/profile` | Auth | Get user profile |
| `GET` | `/friends` | Auth | Get all users except self |
| `PUT` | `/profile` | Auth | Update name/status |
| `PUT` | `/profile/picture` | Auth | Upload profile picture |

#### Messages (`/api/message`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/` | Auth | Send message |
| `GET` | `/` | Auth | Get all messages (paginated) |
| `GET` | `/conversation/:contactId` | Auth | Get conversation with a user |
| `PATCH` | `/seen/:senderId` | Auth | Mark messages as read |

#### WebSocket Events

| Client Event | Server Action | Emitted Event |
|-------------|---------------|---------------|
| `send_message` | Create message in DB | `receive_message` → both parties |
| `typing` | — | `typing` → recipient |
| `stop_typing` | — | `stop_typing` → recipient |
| `seen` | Mark messages as read | `seen` → both parties |

Server-initiated: `user_created` (broadcast), `user_updated` (broadcast)

---

## 🧪 Testing

**Total: 414 tests** (232 server + 99 web + 83 mobile) — all passing.

### Server Tests (232 — custom runner, requires MongoDB)

```bash
cd server
npm run test:all         # All 232 tests (4 suites sequentially)
npm test                 # comprehensive.test.js (80 tests)
npm run test:repos       # repositories.test.js (44 tests)
npm run test:integration # integration.test.js (45 tests)
npm run test:e2e         # api.test.js (63 tests — port 5001)
```

### Web Tests (99 — Jest + @testing-library/react)

```bash
cd web
npm test                 # Watch mode (development)
npm run test:ci          # Single run (CI/servers)
```

### Mobile Tests (83 — Jest 29 + jest-expo 54)

```bash
cd app
npm test                 # Watch mode (development)
npm run test:ci          # Single run (CI/servers)
```

---

## 🎨 Code Quality

### Prettier Formatting

All source code is formatted with Prettier. Configuration is identical across all 3 packages.

```bash
# Format all files (from project root)
node format.mjs

# Check without writing (CI — exits 1 if unformatted)
node format.mjs --check

# Per-package
cd server && npm run format
cd app && npm run format
cd web && npm run format
```

### Line Endings

- `.gitattributes` enforces LF for all text files (`* text=auto eol=lf`)
- Prettier `endOfLine: "lf"` ensures consistency
- Binary files (images, fonts) are marked as binary

---

## 🏛️ Architecture

### Server Patterns

- **Repository Pattern** — Controllers never import models directly; all DB access through `getRepositoryManager()`
- **Storage Strategy Pattern** — File uploads abstracted via `getStorageService()`, switch providers with `STORAGE_TYPE` env var
- **Singleton Pattern** — `RepositoryManager` and `StorageService` instantiated once
- **Validators** — Input validation with Arabic error messages, errors accumulated and thrown at once

### Client Patterns (Web + Mobile)

- **Zustand Store** — Shared state management with persistence (localStorage on web, AsyncStorage on mobile)
- **Axios Interceptors** — Auto-inject Bearer token + handle 401 (redirect on web, logout on mobile)
- **Scoped Typing** — `typing` state stores sender's userId, not a boolean
- **Bidirectional Read Receipts** — `seen` event carries `{ readerId, senderId }`
- **Optimistic Updates** — Messages added locally before server confirmation, deduplicated by `_id` or `clientId`
- **XSS Prevention** — `whitespace-pre-wrap` text rendering on web (no `dangerouslySetInnerHTML`)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`docs/api-endpoints.md`](docs/api-endpoints.md) | REST + WebSocket API reference |
| [`docs/database-abstraction.md`](docs/database-abstraction.md) | Repository Pattern explanation |
| [`docs/testing.md`](docs/testing.md) | All test suites, counts, setup, troubleshooting |
| [`docs/storage.md`](docs/storage.md) | File storage strategy configuration |
| [`docs/deployment.md`](docs/deployment.md) | Deployment guide |
| [`docs/ai/`](docs/ai/) | AI guidance (architecture, feature guide) |
| [`docs/tutorials/`](docs/tutorials/) | Arabic tutorials (19 total: 9 server + 5 web + 5 mobile) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch, commit, tag, formatting standards |

---

## ⚙️ All npm Scripts

### Server

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node index.js` | Production server |
| `dev` | `npx nodemon index.js` | Development with auto-reload |
| `test` | `node tests/comprehensive.test.js` | 80 comprehensive tests |
| `test:repos` | `node tests/repositories.test.js` | 44 repository tests |
| `test:integration` | `node tests/integration.test.js` | 45 integration tests |
| `test:e2e` | `node tests/api.test.js` | 63 E2E API tests |
| `test:all` | All 4 test files sequentially | All 232 tests |
| `format` | `prettier --write "**/*.js"` | Format all JS files |
| `format:check` | `prettier --check "**/*.js"` | Check formatting |

### Web

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `react-scripts start` | Development server |
| `build` | `react-scripts build` | Production build |
| `test` | `react-scripts test` | Watch mode tests |
| `test:ci` | `react-scripts test --watchAll=false` | CI tests (99 tests) |
| `format` | `prettier --write "src/**/*.{js,jsx,css}"` | Format source files |
| `format:check` | `prettier --check "src/**/*.{js,jsx,css}"` | Check formatting |

### Mobile

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `expo start` | Expo development server |
| `android` | `expo start --android` | Android development |
| `ios` | `expo start --ios` | iOS development |
| `test` | `jest --watchAll` | Watch mode tests |
| `test:ci` | `jest --watchAll=false` | CI tests (83 tests) |
| `format` | `prettier --write "**/*.{js,jsx}"` | Format source files |
| `format:check` | `prettier --check "**/*.{js,jsx}"` | Check formatting |

### Root

| Script | Command | Description |
|--------|---------|-------------|
| — | `node format.mjs` | Format all packages |
| — | `node format.mjs --check` | Check all packages (CI) |

---

## ⚙️ CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/build-and-deploy.yml`) runs on every push to `main`:

| Job | What it does |
|-----|-------------|
| **Deploy Server** | Install → Run 232 tests (MongoDB service) → Push to `server` branch |
| **Deploy Web** | Install → Run 99 tests → Build React → Push to `web` branch |

Both jobs run **in parallel**. Deploy commits use `[skip ci]` to prevent recursive triggers.

### GitHub Repository Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `https://your-server.onrender.com` | Server URL for web client build |

See [`.github/workflows/README.md`](.github/workflows/README.md) for full setup guide (Arabic).

---

## 🤝 Contributing

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before making any changes. Key points:

- **Conventional Commits** — English only, imperative mood
- **Annotated Tags** — SemVer, include test counts
- **Prettier** — Run `node format.mjs` before every commit
- **Tests** — All 414 tests must pass before committing

---

## 📅 Project History

### Tags (SemVer)

| Tag | Title | Key Changes |
|-----|-------|------------|
| `v1.0.0` | App Feature-Complete | Server + Web + Mobile with full CRUD, Socket.IO real-time messaging |
| `v1.1.0` | Repository Pattern, Storage & Server Tests | Repository Pattern, Storage Strategy, 232 server tests, tutorials |
| `v1.2.0` | Web Client Security & Tests | Axios interceptors, Zustand, Formik/Yup, 99 web tests, tutorials |
| `v1.3.0` | Mobile Client & Cross-Platform Tests | Mobile interceptors, Zustand/AsyncStorage, 83 mobile tests |
| `v1.4.0` | Code Quality and Contributing Standards | Prettier, .gitattributes, CONTRIBUTING.md, README.md, 414 tests |
| `v1.5.0` | CI/CD Pipeline | GitHub Actions: server tests + web build & deploy |

### Commits

```
git log --oneline --decorate
```

---

**Built with ❤️ — محادثتي**
