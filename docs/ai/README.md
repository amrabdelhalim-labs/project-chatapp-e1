# AI Guidance — My Chat (محادثتي)

This directory contains machine-facing documentation for AI assistants working on this project.

## Files

| File | Purpose |
|------|---------|
| [architecture.md](architecture.md) | System architecture, tech stack, data flow |
| [feature-guide.md](feature-guide.md) | Feature implementation patterns, Socket.IO events, storage |

## Quick Context

- **Name:** My Chat (محادثتي)
- **Type:** Real-time chat application (1:1 messaging)
- **Structure:** 3 packages — `server/` (Express + MongoDB + Socket.IO), `web/` (React CRA), `app/` (Expo + React Native)
- **Language:** JavaScript (ES Modules on server, JSX on clients)
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT with 7-day expiry
- **Real-time:** Socket.IO for messaging, typing indicators, read receipts
- **Storage:** Strategy Pattern (local/Cloudinary/S3) via `STORAGE_TYPE` env var
- **Testing:** Custom runner, 232 server tests (4 test suites)
- **Deployment:** Heroku-ready with Procfile
- **Tutorials:** 9 server tutorials (Arabic) in `docs/tutorials/server/`
