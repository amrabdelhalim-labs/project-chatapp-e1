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

### Adding Tests for a New Feature

**Server:** Add assertions to `comprehensive.test.js` in the appropriate phase, or create targeted tests in `repositories.test.js`.

**Web:** Create test cases in the most relevant existing file:
- Store logic → `globalState.test.js`
- API calls → `requests.test.js`
- Socket events → `integration.test.js`
- UI rendering → `components.test.jsx`
