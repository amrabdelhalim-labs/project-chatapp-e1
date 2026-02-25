# Feature Implementation Guide — My Chat (محادثتي)

## Socket.IO Events Reference

### Server-Side Event Handlers (index.js)

| Client Event | Server Action | Emitted Event | Payload |
|-------------|---------------|---------------|---------|
| `send_message` | `repos.message.create()` | `receive_message` → both parties | `{ ...message, clientId? }` |
| `typing` | — | `typing` → recipient | `socket.userId` (string) |
| `stop_typing` | — | `stop_typing` → recipient | `socket.userId` (string) |
| `seen` | `repos.message.markAsSeen()` | `seen` → both parties | `{ readerId, senderId }` |

### Server-Initiated Events (controllers)

| Trigger | Event | Target |
|---------|-------|--------|
| User registers | `user_created` | Broadcast |
| User updates profile | `user_updated` | Broadcast |

### Client Connection

```javascript
// Web/Mobile
const socket = io(SERVER_URL, { query: "token=" + accessToken });
```

### Client-Side Event Handling (web/src/pages/index.jsx)

```javascript
// typing — stores sender's userId (scoped to active conversation)
socket.on("typing", (senderId) => setTyping(senderId));
socket.on("stop_typing", (senderId) => clearTyping(senderId));

// seen — handles both directions (reader and sender)
socket.on("seen", ({ readerId, senderId }) => {
  if (user._id === readerId) {
    markMessagesSeenFromSender(senderId, user._id);    // I read their messages
  } else if (user._id === senderId) {
    markMyMessagesSeen(user._id, readerId);             // They read my messages
  }
});

// typing indicator renders only for active conversation
{typing === currentReceiver._id ? "typing..." : currentReceiver.status}
```

## Authentication Flow

```
1. Client sends credentials → POST /api/user/login
2. Server validates → findByEmail → bcrypt.compare
3. Server creates JWT → createToken(userId) → 7-day expiry
4. Client stores token → localStorage (web) / AsyncStorage (mobile)
5. Subsequent requests → Authorization: Bearer <token>
6. Socket connection → io({ query: { token } })
```

## Adding a New Feature Checklist

### New API Endpoint

1. Add model fields to `models/` if needed
2. Add repository methods to `repositories/`
3. Add validator in `validators/`
4. Implement controller in `controllers/`
5. Add route in `routes/`
6. Add tests in `tests/comprehensive.test.js`
7. Update `docs/api-endpoints.md`
8. Run `node format.mjs` to format new code

### New Socket.IO Event

1. Add handler in `index.js` under `io.on('connection')`
2. Use `repos` for DB operations (never import models directly)
3. Use `getIO()` for emitting (never use `io` directly in controllers)
4. Add matching client-side handler in web and mobile
5. Document in `docs/api-endpoints.md` WebSocket section

### New Storage Provider

1. Create `server/services/storage/newprovider.strategy.js`
2. Implement all methods from `storage.interface.js`
3. Add case to `StorageService.createStrategy()` in `storage.service.js`
4. Add env vars to `.env.example`
5. Update `docs/storage.md`

## File Upload Guidelines

- Multer uses `memoryStorage` — file data is in `req.file.buffer`
- Max file size: 1MB (configured in `middlewares/multer.js`)
- Allowed types: JPEG, JPG, PNG
- Upload via `getStorageService().uploadFile(req.file)`
- Delete old files via `getStorageService().deleteFile(oldUrl)`
- `default-picture.jpg` is protected from deletion in `LocalStorageStrategy`

## State Management (Clients)

Both web and mobile use Zustand with persistence:

```javascript
// Web: localStorage (with safeParse/safeGet wrappers)
// Mobile: AsyncStorage

// Web Store shape (globalState.js):
{
  socket: null,                     // Socket.IO instance
  accessToken: null,                // JWT string
  user: null,                       // Current user object
  friends: null,                    // Array of friend objects (null = loading)
  messages: [],                     // All messages
  typing: null,                     // userId of who is typing (null = nobody)
  input: "",                        // Current message input text
  currentReceiver: null,            // Selected chat partner

  // Actions
  setSocket, setAccessToken, setUser, setFriends, setMessages, setInput,
  setTyping(userId),                // Store WHO is typing (userId string)
  clearTyping(userId),              // Clear typing only if same userId
  setCurrentReceiver,
  addFriend(user),
  updateFriend(user),               // Immutable update with bounds check
  addMessage(msg),                  // Deduplicate by _id or clientId
  markMessagesSeenFromSender(senderId, currentUserId),  // Incoming messages
  markMyMessagesSeen(myUserId, recipientId),            // Outgoing messages
  logout(),                         // Clear all state + localStorage
}
```

### Axios Interceptors (web only)

```javascript
// requests.js creates axios instance with:
// 1. Request interceptor: auto-inject Bearer token from localStorage
// 2. Response interceptor: redirect to /login on 401
// All API functions use this instance — no manual Authorization headers needed
```

### Axios Interceptors (mobile)

```javascript
// requests.js creates axios instance with axios.create({ baseURL: API_URL }):
// 1. Request interceptor: auto-inject Bearer token from useStore.getState().accessToken
// 2. Response interceptor: 401 → logout() (clears AsyncStorage + Zustand store)
// Token comes from Zustand (not storage) — no manual Authorization headers needed
// login()/register() wrapped in try/catch with error normalization: { error: "message" }
```

### Key Differences: Web vs Mobile State

| Aspect | Web | Mobile |
|--------|-----|--------|
| **Storage** | localStorage (synchronous) | AsyncStorage (async) |
| **Token Source** | localStorage via safeParse/safeGet | Zustand store (populated from AsyncStorage on hydration) |
| **401 Response** | Redirect to /login | logout() → clear AsyncStorage + store |
| **Startup** | Read localStorage inline | `hydrateStore()` in App.js (async) |
| **Safe Guards** | `safeParse()`/`safeGet()` | Not needed (AsyncStorage API is typed) |
| **FormData** | `new File(blob, name)` | `{ uri, name, type }` object |

## Error Handling

- Validators throw errors with `statusCode: 400` and Arabic messages
- `express-async-errors` catches unhandled async errors automatically
- Global error handler in `index.js` handles ValidationError, CastError, and generic errors
- Arabic error messages used throughout for consistency

## Testing

### Server Tests (232 tests — custom runner, requires MongoDB)

```bash
cd server
npm run test:all    # Run all 232 tests
npm test            # comprehensive.test.js (80)
npm run test:repos  # repositories.test.js (44)
npm run test:integration  # integration.test.js (45)
npm run test:e2e    # api.test.js (63) — starts server on port 5001
```

- Tests validators, JWT, socket utility, both repositories, storage service, API endpoints
- E2E tests start real Express server and make HTTP requests
- Integration tests create temp workspace for file operations
- All tests create and clean up test data automatically

### Web Tests (99 tests — Jest + @testing-library/react, no backend needed)

```bash
cd web
npm test             # watch mode (development)
npm run test:ci      # single run (CI/servers)
```

| File | Tests | What It Tests |
|------|-------|---------------|
| `filterMessages.test.js` | 7 | Message filtering between two users |
| `globalState.test.js` | 25 | Zustand store operations + localStorage sync |
| `requests.test.js` | 24 | Axios interceptors + all API function shapes |
| `integration.test.js` | 23 | Socket.IO event flows (message, seen, typing) |
| `components.test.jsx` | 20 | Component rendering, XSS prevention, routing |

**Web test patterns:**
- Mock Axios with `jest.mock('axios')` factory
- Mock `socket.io-client` and simulate event callbacks
- Use `renderHook()` + `act()` for Zustand store testing
- Use `createMemoryRouter` + `RouterProvider` for routing tests
- `setupTests.js` polyfills `TextEncoder` for react-router v7 + jsdom

### Mobile Tests (83 tests — Jest 29 + jest-expo 54, no backend needed)

```bash
cd app
npm test             # watch mode (development)
npm run test:ci      # single run (CI/servers)
npx jest --watchAll=false --verbose  # verbose output
```

| File | Tests | What It Tests |
|------|-------|---------------|
| `globalState.test.js` | 25 | Zustand store + AsyncStorage sync (auth, friends, messages, typing) |
| `filterMessages.test.js` | 7 | Message filtering (same logic as web) |
| `requests.test.js` | 27 | Axios instance + interceptors + API functions + integration scenarios |
| `integration.test.js` | 28 | Socket.IO event flows + conversation isolation + multi-event + guards |

**Mobile test patterns:**
- Must use Jest 29 (not 30) — jest-expo 54 incompatible with Jest 30
- Babel plugins (dotenv + reanimated) excluded in test env via `NODE_ENV` check
- `moduleNameMapper` maps `@env` to `tests/__mocks__/@env.js`
- AsyncStorage mocked with in-memory Map in `tests/__mocks__/@react-native-async-storage/async-storage.js`
- Mock Axios with `jest.mock('axios')` factory (same pattern as web)
- Use `renderHook()` + `act()` for async store testing with AsyncStorage
- Socket.IO events simulated by calling Zustand actions directly

### Adding Tests for a New Feature

**Server:** Add assertions to `comprehensive.test.js` in the appropriate phase, or create targeted tests in `repositories.test.js`.

**Web:** Create test cases in the most relevant existing file:
- Store logic → `globalState.test.js`
- API calls → `requests.test.js`
- Socket events → `integration.test.js`
- UI rendering → `components.test.jsx`

**Mobile:** Same file organization as web:
- Store logic + AsyncStorage → `globalState.test.js`
- Axios/API calls → `requests.test.js`
- Socket events → `integration.test.js`
- Message filtering → `filterMessages.test.js`

### Pre-Commit Checklist

Before every commit, verify:

```bash
# 1. Server tests (232)
cd server && npm run test:all

# 2. Web tests (99)
cd web && npm run test:ci

# 3. Mobile tests (83)
cd app && npm run test:ci

# 4. Formatting — must pass with zero issues
node format.mjs --check
```

All 4 steps must pass. See `CONTRIBUTING.md` for full standards.

### Commit

Separate commits by scope — never mix server + web + app + docs in one commit.

```bash
# Server changes first:
git add server/ && git commit -m "feat(server): add group chat with repository + validators

- Add Group Mongoose model with members array
- Register in models and add GroupRepository extending BaseRepository
- Register in RepositoryManager as getGroupRepository()
- Add group validators with Arabic error messages
- Add group routes with correct middleware order
- Socket.IO: add group_message event handling"

# Then web client:
git add web/ && git commit -m "feat(web): add group chat UI components

- GroupList sidebar with create/join actions
- GroupChat page with message list + input
- Zustand store: groups slice with CRUD + socket sync"

# Then mobile client:
git add app/ && git commit -m "feat(app): add group chat screens

- GroupListScreen with FlatList + pull-to-refresh
- GroupChatScreen with message input + typing indicator
- Navigation: add group stack to drawer"

# Documentation (always last, always separate):
git add docs/ && git commit -m "docs(ai): update architecture with group chat layer"
```

### Tagging (when applicable)

Create an annotated tag only if this commit represents a **significant milestone** — a new feature
complete with tests, or a notable improvement. Patch-level fixes (docs, renames) use `vX.Y.Z`;
new features use `vX.(Y+1).0`.

```bash
git tag -a v1.5.0 -m "v1.5.0 - Add Group Chat System

- Group model + GroupRepository (Mongoose/MongoDB)
- REST routes: POST /groups, GET /groups, DELETE /groups/:id
- Custom validators: name required, members array min 2
- Socket.IO: group_message, group_typing events
- Web: GroupList + GroupChat components
- Mobile: GroupListScreen + GroupChatScreen
- Server tests: 232 → 280 passing
- Web tests: 99 → 115 passing
- Mobile tests: 83 → 96 passing"
```

See `CONTRIBUTING.md` §3 (Commit Messages) and §4 (Tagging Strategy) for full rules.  
See workspace tagging rules: [`docs/ai-improvement-guide.md`](../../../../docs/ai-improvement-guide.md) § Tagging Strategy.

### CI/CD Awareness

After pushing to `main`, GitHub Actions automatically runs server tests + web build & deploy.
Keep in mind:

1. **Server tests require MongoDB** — CI provides a `mongo:7-jammy` service container automatically
2. **Web build uses `REACT_APP_API_URL`** — set as GitHub repository variable, not hardcoded
3. **Mobile is excluded from CI** — Expo/React Native uses platform-specific tools (EAS)
4. **Deploy branches are orphan** — `server` and `web` branches are recreated on every deploy
5. **[skip ci] suffix** — deploy commits use this to prevent infinite workflow loops

If you modify the workflow file (`.github/workflows/build-and-deploy.yml`), validate locally first:

```bash
# 1. Check YAML structure
node -e "const wf=require('fs').readFileSync('.github/workflows/build-and-deploy.yml','utf8'); console.log('Lines:', wf.split('\n').length, '| Tabs:', wf.includes('\t') ? 'BAD' : 'OK')"

# 2. Run server tests with CI env vars (needs local MongoDB)
cd server && NODE_ENV=test JWT_SECRET=test_jwt_secret MONGODB_URL=mongodb://localhost:27017/test_db npm run test:all

# 3. Run web tests + build
cd web && npm run test:ci && REACT_APP_API_URL=https://example.com npm run build

# 4. Simulate deploy cleanup script
node -e "const p=JSON.parse(require('fs').readFileSync('server/package.json')); delete p.devDependencies; ['test:all','test','test:repos','test:integration','test:e2e','format','format:check','dev'].forEach(s=>delete p.scripts[s]); console.log('Remaining:', Object.keys(p.scripts))"

# 5. Test rsync exclusions (build artifacts removal)
mkdir -p /tmp/test-deploy
rsync -r --exclude=node_modules --exclude=.git --exclude=dist --exclude=coverage \
  --exclude=.eslintcache --exclude='*.log' server/ /tmp/test-deploy/
echo "Files deployed (should be < 100):" && find /tmp/test-deploy -type f | wc -l
```

**✅ التحقق الدوري:**

بعد كل إيداع على `main`، تحقق من:
1. **GitHub Actions UI** — تأكد من نجاح Job التوازي
2. **GitHub Pages** — زيارة `https://YOUR_USERNAME.github.io/project-chatapp-e1/`
3. **فرع `web`** — تحقق من وجود `index.html` + assets
4. **فرع `server`** — تحقق من عدم وجود `node_modules`، `dist`، أو ملفات الاختبار
