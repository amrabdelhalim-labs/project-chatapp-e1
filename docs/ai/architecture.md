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
└── tests/
    ├── test.helpers.js          # assert, colors, logSection, printSummary
    ├── comprehensive.test.js    # 80 integration tests (8 phases)
    ├── repositories.test.js     # 44 focused CRUD tests per repository
    ├── integration.test.js      # 45 full-stack tests (storage, JWT, temp workspace)
    └── api.test.js              # 63 E2E HTTP tests (real Express server)
```

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

## Test Scripts

```bash
npm test                 # comprehensive.test.js (80 tests)
npm run test:repos       # repositories.test.js (44 tests)
npm run test:integration # integration.test.js (45 tests)
npm run test:e2e         # api.test.js (63 tests — starts server on port 5001)
npm run test:all         # all four sequentially (232 tests)
```
