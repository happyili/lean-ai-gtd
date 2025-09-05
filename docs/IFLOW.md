# IFLOW.md

This file provides guidance to iFlow Cli when working with code in this repository.

## Project Overview

AIGTD is an intelligent task management assistant with a quick capture system implemented. It uses a React + Vite frontend with TypeScript and Tailwind CSS, and a Python Flask backend with SQLAlchemy for data persistence.

## Architecture

### Backend (Python Flask)
- Entry point: `backend/app.py`
- Database: SQLite (`data/aigtd.db`)
- Models: `backend/app/models/record.py` (Record model)
- Routes: `backend/app/routes/records.py` (CRUD operations)
- Database initialization: `backend/app/database/init.py`

### Frontend (React + Vite + TypeScript)
- Entry point: `frontend/src/main.tsx`
- Main App component: `frontend/src/app/page.tsx`
- Components: `frontend/src/components/QuickCapture/` (CaptureInput.tsx, RecordHistory.tsx)
- Styling: Tailwind CSS
- API communication with backend on port 5050

## Common Commands

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Start Flask development server
python app.py

# Install dependencies
pip install -r requirements.txt
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## API Endpoints

- POST `/api/records` - Create new record
- GET `/api/records` - Get records list with pagination/search
- DELETE `/api/records/{id}` - Delete record (soft delete)
- GET `/api/records/search?q={query}` - Search records

## Development Notes

- Backend runs on port 5050
- Frontend runs on port 3001 (or next available port if 3001 is in use)
- Frontend makes API calls to `http://localhost:5050`
- Records are soft deleted (status changed to 'deleted' rather than actually removed)
- Maximum record content length is 5000 characters
- Three categories supported: idea, task, note