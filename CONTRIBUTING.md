# Contributing Guide — محادثتي (project-chatapp-e1)

> **Read this before making any change.**
> These rules are non-negotiable and enforced at code review. Deviations require explicit
> justification.

---

## 1. Architecture First

Before writing any code, read the AI guidance docs:

| Document | Read when |
|----------|-----------|
| [`docs/ai/README.md`](docs/ai/README.md) | Always — start here |
| [`docs/ai/architecture.md`](docs/ai/architecture.md) | Making any server or client change |
| [`docs/ai/feature-guide.md`](docs/ai/feature-guide.md) | Adding a new entity or feature |

**Critical rules summary (full list in `docs/ai/README.md`):**
- Never import a Mongoose model directly in a controller — use `getRepositoryManager()`
- Route middleware order is fixed: `isAuthenticated` → `upload` → validators → controller
- Validators use custom functions with Arabic error messages — never inline validation in controllers
- Auth token via Zustand store — never `localStorage` (web) or raw `AsyncStorage` (mobile)
- File storage via `getStorageService()` — never instantiate `StorageService` directly
- HTTP requests via the `api` axios instance — never raw `fetch` or `axios`
- Socket.IO events must be scoped (typing per sender, seen bidirectional)

---

## 2. Branch Naming

```
main           ← production-ready code only; never commit directly
feat/<topic>   ← new feature (e.g., feat/group-chat)
fix/<topic>    ← bug fix (e.g., fix/typing-indicator-scope)
docs/<topic>   ← documentation only (e.g., docs/update-ai-guide)
chore/<topic>  ← tooling, dependencies, config (e.g., chore/add-prettier)
refactor/<topic> ← refactor without behavior change
```

---

## 3. Commit Messages

**Format:** [Conventional Commits](https://www.conventionalcommits.org/) — English only.

```
<type>(<scope>): <short description>

<body — list of changes, one per line starting with ->

<footer — breaking changes or issue references>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or behavior |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `test` | Adding or updating tests |
| `refactor` | Code restructure without behavior change |
| `chore` | Tooling, config, dependencies, CI |
| `style` | Formatting only (no logic change) |

### Scopes

| Scope | Applies to |
|-------|-----------|
| `server` | `server/` directory |
| `app` | `app/` directory (React Native mobile) |
| `web` | `web/` directory (React CRA web) |
| `docs` | `docs/` directory |
| `ai` | `docs/ai/` specifically |
| `ci` | `.github/workflows/` |

### Rules

1. **Subject line ≤ 72 characters**
2. **Subject uses imperative mood** — "add", "fix", "update", not "added", "fixed"
3. **No period at end of subject line**
4. **Body mandatory for non-trivial commits** — list each significant change
5. **Separate subject from body with a blank line**
6. **One logical change per commit** — do not mix server + app + web + docs in one commit

### Examples

```bash
# ✅ CORRECT
git commit -m "feat(server): add group chat with repository + validators

- Add Group Mongoose model with members array
- Register in models and add GroupRepository extending BaseRepository
- Register in RepositoryManager as getGroupRepository()
- Add group validators with Arabic error messages
- Add group routes with correct middleware order
- Socket.IO: add group_message event handling"

# ✅ CORRECT (patch)
git commit -m "fix(web): use api axios instance in GroupService

- Replace raw axios.post() with api.post() to ensure token injection"

# ✅ CORRECT (docs only)
git commit -m "docs(ai): update architecture with group chat layer"

# ❌ WRONG — Arabic subject
git commit -m "إضافة المجموعات"

# ❌ WRONG — mixed scope
git commit -m "feat: add groups server and web and app"

# ❌ WRONG — no body on non-trivial commit
git commit -m "feat(server): add repository pattern"

# ❌ WRONG — past tense
git commit -m "feat(server): added group endpoint"
```

---

## 4. Tagging Strategy

Tags mark **meaningful release milestones** — not every commit.

### When to create a tag

| Version bump | Trigger |
|---|---|
| `v1.0.0` (major) | First production-ready version, or breaking change |
| `v1.X.0` (minor) | New feature complete with tests |
| `v1.X.Y` (patch) | Documentation fix, bug fix, minor correction |

**Never tag:**
- Work-in-progress commits
- Commits with failing tests
- Individual "Finished: X page" style commits
- Every commit in a feature branch

### Tag format — annotated tags only

```bash
# Annotated tag (ALWAYS use -a flag — never lightweight tags)
git tag -a v1.2.0 -m "v1.2.0 - Add Group Chat System

- Group model + GroupRepository (Mongoose/MongoDB)
- REST routes: POST /groups, GET /groups, DELETE /groups/:id
- Custom validators: name required, members array min 2
- Socket.IO: group_message, group_typing events
- Client: GroupList + GroupChat components
- Server tests: 232 → 280 passing"

# Tag on a past commit
git tag -a v1.0.0 <hash> -m "v1.0.0 - ..."
```

### Tag message rules

1. **First line:** `vX.Y.Z - Human-readable title`
2. **Body:** bullet list of the most significant changes
3. **Include test counts** if tests changed
4. **English only**

---

## 5. Code Formatting

**All code is formatted with Prettier** before every commit. No manual indentation decisions.

```bash
# Format all source files (run from project root — works on all OS)
node format.mjs

# Check without writing (used in CI)
node format.mjs --check

# Or per-package:
cd server && npm run format
cd app && npm run format
cd web && npm run format
```

**Prettier config** (`.prettierrc.json` in `server/`, `app/`, and `web/`):
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

**Rules:**
- 2-space indentation — always, no tabs
- Single quotes for strings
- Trailing commas in multi-line structures (ES5 compatible)
- Max line width: 100 characters
- Never manually adjust whitespace — let Prettier decide

---

## 6. Pre-Commit Checklist

Run this before every `git commit`:

```bash
# 1. All server tests (232 tests)
cd server && npm run test:all

# 2. All web tests (99 tests)
cd web && npm run test:ci

# 3. All mobile tests (83 tests)
cd app && npm run test:ci

# 4. Prettier — ensure formatting is applied
node format.mjs --check
```

**All of the above must pass before committing.** A commit with failing tests or
unformatted code must never reach `main`.

---

## 7. Documentation Updates

When adding or changing a feature:

| Change type | Required doc updates |
|-------------|---------------------|
| New entity (model + repo + controller) | `docs/ai/feature-guide.md`, `docs/ai/architecture.md`, `docs/api-endpoints.md` |
| New REST endpoint | `docs/api-endpoints.md`, `docs/ai/README.md` (API table) |
| New env var | `docs/ai/README.md` (env vars section), `README.md` |
| New test file | `docs/testing.md` |
| New storage provider | `docs/storage.md`, `docs/ai/architecture.md` |
| Auth change | `docs/ai/architecture.md` (auth section) |
| New Socket.IO event | `docs/ai/architecture.md`, `docs/api-endpoints.md` |
| New web/mobile component | `docs/ai/feature-guide.md` |

**Documentation commits must be separate from code commits** (use `docs` type).

---

## 8. Testing Requirements

| Test suite | Command | Count | Must pass before |
|-----------|---------|-------|-----------------|
| Server comprehensive | `cd server && npm test` | 80 | Any server commit |
| Server repositories | `cd server && npm run test:repos` | 44 | Any server commit |
| Server integration | `cd server && npm run test:integration` | 45 | Any server commit |
| Server E2E API | `cd server && npm run test:e2e` | 63 | Any server commit |
| Web tests | `cd web && npm run test:ci` | 99 | Any web commit |
| Mobile tests | `cd app && npm run test:ci` | 83 | Any mobile commit |
| **Total** | — | **414** | Any release tag |

See [`docs/testing.md`](docs/testing.md) for full test documentation.
