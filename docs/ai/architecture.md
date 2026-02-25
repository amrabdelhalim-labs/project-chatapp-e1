# Architecture — My Chat (محادثتي)

## System Overview

```
┌─────────────┐     ┌─────────────┐     ┌────────────────┐
│  Mobile App │     │   Web App   │     │    Server      │
│  (Expo/RN)  │────▶│  (React)    │────▶│  (Express)     │
│  Zustand    │     │  Zustand    │     │  Socket.IO     │
│  Socket.IO  │     │  Socket.IO  │     │  MongoDB       │
└─────────────┘     └─────────────┘     └────────────────┘
```

## Project Root

```
project-chatapp-e1/
├── .gitattributes              # LF line-ending enforcement (* text=auto eol=lf)
├── .gitignore                  # node_modules, .expo, .env, coverage, dist, build
├── CONTRIBUTING.md             # Branch naming, commits, tagging, formatting, pre-commit checklist
├── format.mjs                  # Cross-platform Prettier runner (node format.mjs [--check])
├── README.md                   # Project overview, setup, architecture, scripts
├── server/                     # Express REST API + Socket.IO + MongoDB
├── web/                        # React CRA web client
├── app/                        # Expo + React Native mobile client
└── docs/                       # Documentation (reference, tutorials, AI guidance)
```

## Server Architecture

```
server/
├── index.js                    # Entry point: Express + Socket.IO setup
├── config.js                   # MongoDB connection + server startup
├── controllers/
│   ├── user.js                 # Auth (register/login) + profile management
│   └── message.js              # CRUD + pagination + conversation endpoints
├── repositories/
│   ├── repository.interface.js # JSDoc type definitions
│   ├── base.repository.js      # Generic CRUD (findAll, findPaginated, etc.)
│   ├── user.repository.js      # User-specific queries (findByEmail, etc.)
│   ├── message.repository.js   # Message-specific queries (conversation, seen)
│   └── index.js                # RepositoryManager singleton
├── validators/
│   ├── user.validator.js       # Register/login/update validation (Arabic errors)
│   └── message.validator.js    # Message content validation
├── services/
│   └── storage/
│       ├── storage.interface.js    # StorageStrategy contract (JSDoc)
│       ├── storage.service.js      # Factory singleton (local/cloudinary/s3)
│       ├── local.strategy.js       # Filesystem storage
│       ├── cloudinary.strategy.js  # Cloudinary CDN
│       └── s3.strategy.js          # AWS S3
├── middlewares/
│   ├── isAuthenticated.js      # JWT auth (HTTP + Socket.IO)
│   └── multer.js               # File upload (memoryStorage, 1MB, images only)
├── models/
│   ├── User.js                 # firstName, lastName, email, password, profilePicture, status
│   └── Message.js              # sender, recipient, content, seen (with indexes)
├── utils/
│   ├── jwt.js                  # createToken (7-day expiry) + verifyToken
│   └── socket.js               # setIO/getIO — breaks circular dependency
├── routes/
│   ├── user.js                 # /api/user/*
│   └── message.js              # /api/message/*
├── Procfile                     # Heroku deployment (web: node index.js)
├── .prettierrc.json             # Prettier config (singleQuote, tabWidth:2, endOfLine:lf)
├── .prettierignore              # Excludes node_modules/, public/uploads/
└── tests/
    ├── test.helpers.js          # assert, colors, logSection, printSummary
    ├── comprehensive.test.js    # 80 integration tests (8 phases)
    ├── repositories.test.js     # 44 focused CRUD tests per repository
    ├── integration.test.js      # 45 full-stack tests (storage, JWT, temp workspace)
    └── api.test.js              # 63 E2E HTTP tests (real Express server)
```

## Web Client Architecture

```
web/
├── package.json                # React 19, CRA, Zustand, Socket.IO, Axios, Formik, Yup, Tailwind
├── .env.example                # REACT_APP_API_URL=http://localhost:5000
├── .prettierrc.json            # Prettier config (same as server)
├── .prettierignore             # Excludes node_modules/, build/, coverage/
└── src/
    ├── index.jsx               # ReactDOM.createRoot entry point
    ├── App.jsx                 # Renders <Router />
    ├── routes.jsx              # createBrowserRouter: / (ProtectedRoute → Home), /login, /register
    ├── index.css               # Tailwind directives + base styles
    ├── libs/
    │   ├── globalState.js      # Zustand store (socket, user, friends, messages, typing)
    │   ├── requests.js         # Axios instance with interceptors (auto-inject token, 401 redirect)
    │   └── filterMessages.js   # getReceiverMessages(messages, receiverId, currentUserId)
    ├── pages/
    │   ├── index.jsx           # Home — Socket.IO connection, event listeners, data fetching
    │   ├── login.jsx           # Formik + Yup login form
    │   └── register.jsx        # Formik + Yup registration form
    └── components/
        ├── ProtectedRoute.jsx  # Redirects to /login if no token
        ├── Loading.jsx         # Spinner component
        ├── Chat/
        │   ├── index.jsx       # Chat container — useParams(), auto-scroll, seen emit
        │   ├── ChatHeader.jsx  # Receiver info + typing indicator + logout
        │   ├── ChatFooter.jsx  # Message input + send (socket + optimistic update)
        │   ├── ChatMessage.jsx # Single message bubble (safe text rendering, no XSS)
        │   └── NoUserSelected.jsx  # Welcome screen when no chat selected
        ├── Sidebar/
        │   ├── index.jsx       # Friends list, search, unread filter
        │   └── MessageItem.jsx # Friend row — last message, unread count, seen emit
        └── Profile/
            ├── index.jsx       # Profile picture upload + editable fields
            └── EditableInput.jsx  # Inline edit with save-on-confirm
    ├── setupTests.js           # TextEncoder polyfill + @testing-library/jest-dom
    └── tests/
        ├── filterMessages.test.js  # 7 tests — message filtering logic
        ├── globalState.test.js     # 25 tests — Zustand store operations
        ├── requests.test.js        # 24 tests — Axios interceptors + API functions
        ├── integration.test.js     # 23 tests — Socket.IO event flow simulation
        └── components.test.jsx     # 20 tests — component rendering + XSS prevention
```

### Web Key Patterns

1. **Axios Interceptors:** `requests.js` creates an Axios instance with request interceptor (auto-inject `Bearer` token from `localStorage`) and response interceptor (redirect to `/login` on 401).
2. **useParams() over pathname:** All components use `useParams()` for `receiverId` instead of `pathname.slice(1)`.
3. **Safe Text Rendering:** `ChatMessage.jsx` uses `whitespace-pre-wrap` CSS class instead of `dangerouslySetInnerHTML` to prevent XSS.
4. **Optimistic Updates:** `ChatFooter` adds messages locally with `clientId` before server confirmation; `addMessage()` deduplicates by `_id` or `clientId`.
5. **Scoped Typing:** `typing` state stores the sender's userId (not a boolean) — only shows "typing..." when the current receiver is the one typing.
6. **Bidirectional Read Receipts:** `seen` event carries `{ readerId, senderId }` — works for both the reader (mark incoming as read) and sender (mark outgoing as read).
7. **Safe localStorage:** `safeParse()` / `safeGet()` wrappers handle corrupt/null/undefined values with try-catch.

## Mobile App Architecture

```
app/
├── package.json                # Expo ~54, React Native 0.81.5, React 19, Zustand, Axios, Socket.IO
├── App.js                      # Entry: hydrateStore → NativeBaseProvider + BackHandler
├── navigation.js               # Stack Navigator (Login, Register, Home → Tab Navigator)
├── babel.config.js             # babel-preset-expo + dotenv/reanimated (excluded in test env)
├── .env                        # API_URL=http://localhost:5000
├── .prettierrc.json            # Prettier config (same as server)
├── .prettierignore             # Excludes node_modules/, android/, ios/, .expo/, *.d.ts
├── libs/
│   ├── globalState.js          # Zustand store + AsyncStorage persistence (not localStorage)
│   ├── requests.js             # axios.create() + interceptors (token from Zustand, 401→logout)
│   └── filterMessages.js       # getReceiverMessages() — same logic as web
├── screens/
│   ├── login.js                # Formik + Yup login form
│   ├── register.js             # Formik + Yup registration form
│   └── home/
│       ├── index.js            # Socket.IO connection, event listeners, Tab Navigator
│       ├── chat.js             # Friends list (FlatList) → navigate to messages
│       ├── messages.js         # Chat screen — send/receive/seen/typing
│       └── profile.js          # Profile picture (expo-image-picker), EditUserModal
├── components/
│   ├── Header.js               # Green header bar + logout button
│   ├── EditUserModal.js        # NativeBase Modal + Formik form
│   └── Chat/                   # (Additional chat sub-components)
└── tests/
    ├── __mocks__/
    │   ├── @env.js                              # { API_URL: "http://localhost:5000" }
    │   └── @react-native-async-storage/
    │       └── async-storage.js                 # In-memory Map mock
    ├── globalState.test.js                      # 25 tests — store + AsyncStorage
    ├── filterMessages.test.js                   # 7 tests — pure function
    ├── requests.test.js                         # 27 tests — Axios + interceptors + API
    └── integration.test.js                      # 28 tests — Socket.IO event flow
```

### Mobile Key Patterns

1. **axios.create() Instance:** `requests.js` uses `axios.create({ baseURL })` (not `axios.defaults.baseURL`) — avoids global side effects.
2. **Token from Zustand:** Request interceptor reads `useStore.getState().accessToken` — no manual token passing needed in API calls.
3. **AsyncStorage Persistence:** `setUser()` and `setAccessToken()` are async — they `await AsyncStorage.setItem()`. The `hydrateStore()` in `App.js` reads from AsyncStorage on app launch.
4. **401 → Logout:** Response interceptor calls `logout()` which clears both AsyncStorage (3 keys) and Zustand store.
5. **Scoped Typing:** Same as web — `typing` stores `senderId`, `clearTyping(id)` only clears if the same sender.
6. **Bidirectional Seen:** Same as web — `seen` event carries `{ readerId, senderId }`.
7. **FormData for React Native:** `updateProfilePicture(uri)` builds FormData with `{ uri, name, type }` (not a File blob like web).
8. **No XSS Risk:** React Native renders text via `<Text>` component — no HTML injection possible.
9. **Immutable Updates:** `addFriend()` and `updateFriend()` create new array copies; `updateFriend()` has bounds check (`if (index === -1) return`).

## Data Flow

### Authentication
```
Client → POST /api/user/login → validateLoginInput → findByEmail → bcrypt.compare → createToken (7d) → response
```

### Sending a Message (Socket.IO)
```
Client → socket.emit('send_message', { receiverId, content, clientId })
  → Server: repos.message.create({ sender, recipient, content })
  → Server: io.to([receiverId, senderId]).emit('receive_message', message)
  → Both clients receive and render the message
```

### Profile Picture Upload
```
Client → PUT /api/user/profile/picture (multipart)
  → multer (memoryStorage) → controller
  → storage.uploadFile(req.file) → { url, filename }
  → repos.user.updateProfilePicture(userId, url)
  → storage.deleteFile(previousPicture)
  → io.emit('user_updated', user)
```

## Key Patterns

1. **Repository Pattern:** Controllers never import models directly. All DB access goes through `getRepositoryManager()`.
2. **Storage Strategy:** File uploads abstracted via `getStorageService()`. Switch providers with `STORAGE_TYPE` env var.
3. **Socket Utility:** `utils/socket.js` exports `setIO/getIO` to avoid circular dependency between `index.js` and controllers.
4. **Error Accumulation:** Validators collect all errors, then throw a single error with `statusCode: 400`.
5. **express-async-errors:** Automatically catches async errors and forwards to the global error handler.

## Database Indexes

```javascript
// Message model
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, seen: 1 });
messageSchema.index({ createdAt: -1 });
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 5000 | Server port |
| MONGODB_URL | Yes | — | MongoDB connection string |
| JWT_SECRET | Yes | — | JWT signing secret |
| STORAGE_TYPE | No | local | Storage backend (local/cloudinary/s3) |

## Testing Architecture

### Server Tests (232 tests — custom runner)

| File | Tests | Level | What It Tests |
|------|-------|-------|---------------|
| `comprehensive.test.js` | 80 | Integration | All layers in a single workflow (validators → JWT → repos → storage) |
| `repositories.test.js` | 44 | Unit | CRUD operations per repository in isolation |
| `integration.test.js` | 45 | Integration | Full-stack with temp workspace (storage + JWT + validators) |
| `api.test.js` | 63 | E2E | Real HTTP requests against Express server on port 5001 |

```bash
cd server
npm run test:all         # all 232 tests (4 files sequentially)
npm test                 # comprehensive.test.js (80 tests)
npm run test:repos       # repositories.test.js (44 tests)
npm run test:integration # integration.test.js (45 tests)
npm run test:e2e         # api.test.js (63 tests — port 5001)
```

### Web Tests (99 tests — Jest + @testing-library/react)

| File | Tests | Level | What It Tests |
|------|-------|-------|---------------|
| `filterMessages.test.js` | 7 | Unit | `getReceiverMessages()` bidirectional filtering |
| `globalState.test.js` | 25 | Unit | Zustand store (user, friends, messages, typing, localStorage sync) |
| `requests.test.js` | 24 | Unit | Axios interceptors (token injection, 401 redirect), all API functions |
| `integration.test.js` | 23 | Integration | Socket.IO event flows (messages, seen, typing, broadcasts) |
| `components.test.jsx` | 20 | Component | ChatMessage XSS, ProtectedRoute, ChatHeader, ChatFooter, Router |

```bash
cd web
npm test                 # watch mode (development)
npm run test:ci          # single run, no watch (CI/servers)
```

### Web Test Infrastructure Notes

- **TextEncoder polyfill:** `setupTests.js` polyfills `TextEncoder`/`TextDecoder` for jsdom (required by react-router v7)
- **react-router v7 moduleNameMapper:** `package.json` jest config maps `react-router-dom`, `react-router`, and `react-router/dom` to dist files because CRA's Jest can't resolve `exports` field
- **transformIgnorePatterns:** react-router packages are transformed (not ignored) since they use ESM internally
- **No real server needed:** All web tests mock Axios and Socket.IO — they run without a backend

### Mobile Tests (83 tests — Jest 29 + jest-expo 54)

| File | Tests | Level | What It Tests |
|------|-------|-------|---------------|
| `globalState.test.js` | 25 | Unit | Zustand store + AsyncStorage sync (auth, friends, messages, typing) |
| `filterMessages.test.js` | 7 | Unit | `getReceiverMessages()` bidirectional filtering |
| `requests.test.js` | 27 | Unit+Integration | Axios instance + interceptors + all API functions + integration scenarios |
| `integration.test.js` | 28 | Integration | Socket.IO event flows (messages, seen, typing, broadcasts, isolation, multi-event) |

```bash
cd app
npm test                 # watch mode (development)
npm run test:ci          # single run, no watch (CI/servers)
npx jest --watchAll=false --verbose  # verbose output
```

### Mobile Test Infrastructure Notes

- **Jest 29 required:** jest-expo 54 is incompatible with Jest 30 (`__ExpoImportMetaRegistry` error)
- **Babel plugin exclusion:** Both `react-native-dotenv` and `react-native-reanimated/plugin` are excluded when `NODE_ENV === "test"` — dotenv would inline real .env values (bypassing moduleNameMapper mock), reanimated requires worklets plugin
- **moduleNameMapper:** Maps `^@env$` to `tests/__mocks__/@env.js` (exports `API_URL = "http://localhost:5000"`)
- **AsyncStorage mock:** In-memory Map-based mock in `tests/__mocks__/@react-native-async-storage/async-storage.js`
- **No real server needed:** All mobile tests mock Axios and AsyncStorage — they run without a backend

## Code Quality Toolchain

### Prettier Formatting

All source code is formatted with Prettier. Configuration is identical across all 3 packages:

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

### Formatting Commands

```bash
# Format all packages from project root
node format.mjs

# Check only (CI — exit 1 if unformatted)
node format.mjs --check

# Per-package
cd server && npm run format      # **/*.js
cd app && npm run format          # **/*.{js,jsx}
cd web && npm run format          # src/**/*.{js,jsx,css}
```

### Line Ending Enforcement

- `.gitattributes` at project root: `* text=auto eol=lf`
- Prettier `endOfLine: "lf"` in all packages
- After adding `.gitattributes`: `git add --renormalize .` was run to normalize all tracked files
- Binary files (images, fonts, PDFs, ZIPs) are marked as binary in `.gitattributes`

### Contributing Standards

`CONTRIBUTING.md` at project root defines 8 sections:
1. Architecture First — read `docs/ai/` before coding
2. Branch Naming — `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`
3. Commit Messages — Conventional Commits, English, imperative mood
4. Tagging Strategy — annotated tags only, SemVer, test counts in message
5. Code Formatting — Prettier config, `format.mjs` usage
6. Pre-Commit Checklist — tests + formatting
7. Documentation Updates — table mapping change types to required doc updates
8. Testing Requirements — all suites with counts and commands
