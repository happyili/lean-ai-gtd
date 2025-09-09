# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Flask API. Modules under `app/` (`models/`, `routes/`, `database/`). Entry points: `backend/app.py`, `backend/index.py`.
- `frontend/`: Vite + React + TypeScript app. Source in `frontend/src/`.
- `data/`: Local SQLite files. Do not commit generated DBs.
- `docs/`: Documentation. See `DEPLOYMENT.md` for deploy notes.
- Root test utilities: `test_*.py` target the Flask app; additional frontend tests under `frontend/tests/`.

## Build, Test, and Development Commands
- Backend (Python ≥3.12.0)
  - Setup: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
  - Run API: `python backend/app.py` (listens on `http://localhost:5050`).
  - Migrations/utilities: `python backend/migrate_database.py`
- Frontend (Node 18+)
  - Install: `cd frontend && npm install`
  - Dev server: `npm run dev`
  - Build: `npm run build` then `npm run preview`
  - Lint: `npm run lint`
- Frontend tests (Jest)
  - First-time setup: `cd frontend/tests && ./setup.sh`
  - Run suite: `cd frontend && ./tests/run-tests.sh`
- Backend test scripts
  - Examples: `python test_login.py`, `python test_record_with_flask.py`

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indents, snake_case for modules/functions, PascalCase for classes. Keep changes minimal and localized; prefer small, focused functions.
- TypeScript/React: ESLint-configured; run `npm run lint`. Use PascalCase for components, camelCase for props/state, `src/components/...` for UI, `src/utils/...` for helpers.
- Files: use clear, scoped names (e.g., `record_service.py`, `AuthPage.tsx`).

## Testing Guidelines
- Aim to cover new routes/components with unit tests (frontend Jest) or targeted Python scripts for backend.
- Place React tests in `frontend/tests/*.test.tsx`. Name Python scripts `test_*.py` at repo root or under `backend/`.
- Backend manual checks: verify `/health` and key endpoints with curl or the provided scripts.

## Commit & Pull Request Guidelines
- Commit messages: Conventional style recommended — `feat(frontend): add task filter`, `fix(backend): correct JWT expiry`.
- PRs: include summary, linked issues, reproduction/fix notes, and screenshots for UI.
- Keep PRs small; update docs and `.env.example` when changing configuration.

## Security & Configuration
- Never commit secrets. Copy `env.example` → `.env` (root/backend) and set `VITE_API_BASE_URL`, `JWT_SECRET_KEY`, DB URL, etc.
- CORS and ports: backend defaults to `5050`; frontend points to `VITE_API_BASE_URL`.
