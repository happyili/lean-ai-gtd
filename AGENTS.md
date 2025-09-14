# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Flask + Python + posgresSQL / sqllite)
```bash
cd backend
python -m venv venv && source venv/bin/activate  # Create/activate virtual environment
uv pip install -r requirements.txt                   # Install dependencies
python app.py                                     # Start Flask server (port 5050)
python migrate_pomodoro_table.py                  # Run database migrations
```

### Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
npm run test:ui      # Run tests with UI
npm run test:run     # Run tests once
```

## Architecture Overview

### Full-Stack Task Management System
AIGTD is an intelligent task management system with two primary features:
1. **Quick Capture System** - Rapid note/task/idea recording with minimal friction
2. **AI Pomodoro Timer** - AI-generated focused work sessions based on user's active tasks

### High-Level Architecture

**Frontend (React/TypeScript)**
- Main app container: `frontend/src/app/page.tsx` - Orchestrates all major components
- Authentication context: `frontend/src/contexts/AuthContext.tsx` - Global auth state management
- Core components:
  - `QuickCapture/TaskList.tsx` - Primary task management interface
  - `PomodoroManager.tsx` - AI pomodoro timer with compressed task display
  - `Auth/UserMenu.tsx` - User authentication and menu system

**Backend (Flask/Python)**
- App factory: `backend/app/__init__.py` - Creates Flask app with blueprints
- Database initialization: `backend/app/database/init.py` - Handles SQLite/PostgreSQL setup
- Models:
  - `Record` - Core task/note/idea model with hierarchical support (parent/subtask)
  - `User` - Authentication and user management
  - `PomodoroTask` - AI-generated focused work sessions
- Services:
  - `PomodoroIntelligenceService` - AI integration for generating optimal work sessions
  - `AIIntelligenceService` - General AI features for task analysis

### Data Flow Architecture

**Authentication Flow:**
```
AuthContext → JWT tokens → Flask @token_required → User model
```

**Task Management Flow:**
```
TaskList component → API calls → Records blueprint → Record model → SQLite/PostgreSQL
```

**AI Pomodoro Flow:**
```
PomodoroManager → generate_pomodoro_tasks API → PomodoroIntelligenceService → 
OpenRouter/Claude AI → PomodoroTask model → Compressed UI display
```

### Database Schema Strategy

**Multi-model approach:**
- `records` table: Flexible content storage (ideas/tasks/notes) with hierarchical structure
- `users` table: Authentication with JWT refresh token support
- `pomodoro_tasks` table: AI-generated work sessions with progress tracking

**Key relationships:**
- Records support parent/child relationships for subtasks
- Both guest and authenticated user workflows supported
- Pomodoro tasks link back to original records via `related_task_ids`

### Frontend State Management

**React Context Pattern:**
- `AuthContext` manages global authentication state
- Local component state for UI interactions
- API utility layer (`utils/api.ts`) handles HTTP requests and error standardization

**Component Architecture:**
- Container components manage state and API calls
- Presentational components focus on UI rendering
- Shared utilities for common operations (auth, API, export)

### Backend Service Layer

**Modular Flask Blueprint Design:**
```
/api/records    - CRUD operations for tasks/notes/ideas
/api/auth       - User registration, login, token management
/api/pomodoro   - AI-generated pomodoro tasks and statistics
```

**AI Integration Architecture:**
- OpenRouter integration for Claude AI access
- Prompt engineering for task analysis and pomodoro generation
- Fallback and error handling for AI service failures

### Key Design Patterns

**Frontend:**
- React Hooks pattern for state management
- TypeScript interfaces for type safety
- Tailwind CSS for responsive design
- Lucide React for consistent iconography

**Backend:**
- Blueprint pattern for modular routing
- SQLAlchemy ORM with model relationships
- Decorator pattern for authentication (@token_required)
- Factory pattern for app creation (create_app())

**Database:**
- Single table inheritance for different record types (idea/task/note)
- Soft delete pattern via status field
- UTC timezone handling throughout
- Auto-increment IDs with BigInteger support

### Critical Integration Points

**API Data Format Consistency:**
- All timestamps use ISO format with 'Z' suffix
- Standardized error responses with error codes
- Consistent success/failure response structure

**Authentication Flow:**
- JWT tokens with refresh mechanism
- Guest user support (user_id = null)
- Rate limiting on auth endpoints

**AI Service Integration:**
- OpenRouter as AI provider abstraction
- Prompt templates for consistent AI interactions
- Error handling and fallback for AI failures

### Testing Strategy

**Unittest:**
- Always try to add unittest testcases to cover important and corner case logics for both frontend and backend.
- For each testcases, it should have clear asserts, and try best to avoid mocks.
- Test out that the unittest will fail if the logic is wrong. And leave the unittest to fail if you can't fix it. Never do mocks and fake logics to only pass unittests.

**Frontend:**
- Vitest for unit testing
- Testing Library for React component testing
- TypeScript compilation as build-time verification

**Backend:**
- Custom test scripts for database operations
- Integration testing for API endpoints
- Migration scripts for schema changes


### Development Patterns

**File Organization:**
- Backend: models/ routes/ services/ utils/ structure
- Frontend: components/ organized by feature areas
- Shared: API interfaces and types between frontend/backend

**Code Style:**
- TypeScript strict mode enabled
- ESLint for code quality
- Consistent error handling patterns
- UTC timezone usage throughout

## Environment Configuration

**Backend Environment Variables:**
- `DATABASE_URL` - SQLite or PostgreSQL connection string
  - Local database: DATABASE_URL=sqlite:////Users/yiling/git/AIGTD/data/aigtd.db
  - Remote database: DATABASE_URL=postgresql://postgres.bkhfvcundjhzadxpdzuz:XXMWy3ququkVFAje@aws-1-us-east-2.pooler.supabase.com:5432/postgres
- `JWT_SECRET_KEY` - Token signing secret
- OpenRouter API credentials for AI integration

**Frontend Environment Variables:**
- `VITE_API_BASE_URL` - Backend API base URL (default: http://localhost:5050)

## Database Management

**Migration Strategy:**
- `migrations/`: sql migration scripts for sqllite(local db) and posgresSQL on supabase(remote)
- Manual migration scripts in backend/ directory
- Schema deployment via `deploy_schema.py`
- Separate migration for pomodoro features
- first test out the migration on local database, and then prepare the migration script for migration on production database (need to be supabase & posgresSQL compatible)

**Database Initialization:**
- Auto-detection of SQLite vs PostgreSQL
- Table creation with proper indexes
- Admin user setup for development


## Commit & Pull Request Guidelines
- Commit messages: Conventional style recommended — `feat(frontend): add task filter`, `fix(backend): correct JWT expiry`.
- PRs: include summary, linked issues, reproduction/fix notes, and screenshots for UI.
- Keep PRs small; update docs and `.env.example` when changing configuration.

## Security & Configuration
- Never commit secrets. Copy `env.example` → `.env` (root/backend) and set `VITE_API_BASE_URL`, `JWT_SECRET_KEY`, DB URL, etc.
- CORS and ports: backend defaults to `5050`; frontend points to `VITE_API_BASE_URL`.
