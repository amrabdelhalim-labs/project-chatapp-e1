# Feature Implementation Guide — My Chat (محادثتي)

## Socket.IO Events Reference

### Server-Side Event Handlers (index.js)

| Client Event | Server Action | Emitted Event |
|-------------|---------------|---------------|
| `send_message` | `repos.message.create()` | `receive_message` → both parties |
| `typing` | — | `typing` → recipient |
| `stop_typing` | — | `stop_typing` → recipient |
| `seen` | `repos.message.markAsSeen()` | `seen` → both parties |

### Server-Initiated Events (controllers)

| Trigger | Event | Target |
|---------|-------|--------|
| User registers | `user_created` | Broadcast |
| User updates profile | `user_updated` | Broadcast |

### Client Connection

```javascript
// Web/Mobile
const socket = io(SERVER_URL, { query: { token: accessToken } });
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
// Web: localStorage
// Mobile: AsyncStorage

// Store shape (shared concept):
{
  user: null,
  accessToken: null,
  friends: [],
  messages: [],
  addMessage(msg),
  addFriend(user),
  updateFriend(user),
  setMessages(msgs),
  // ...
}
```

## Error Handling

- Validators throw errors with `statusCode: 400` and Arabic messages
- `express-async-errors` catches unhandled async errors automatically
- Global error handler in `index.js` handles ValidationError, CastError, and generic errors
- Arabic error messages used throughout for consistency

## Testing

```bash
npm run test:all    # Run all 232 tests
npm test            # comprehensive.test.js (80)
npm run test:repos  # repositories.test.js (44)
npm run test:integration  # integration.test.js (45)
npm run test:e2e    # api.test.js (63) — starts server on port 5001
```

- 232 tests across 4 suites
- Tests validators, JWT, socket utility, both repositories, storage service, API endpoints
- E2E tests start real Express server and make HTTP requests
- Integration tests create temp workspace for file operations
- All tests create and clean up test data automatically
- Requires active MongoDB connection
