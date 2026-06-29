# AI-Assisted Will Maker

A full‑stack application that lets a user write their will by chatting with an AI assistant.  
The assistant asks simple questions, extracts structured information, and produces a downloadable PDF.

## Tech Stack

- **Backend:** NestJS + TypeORM + PostgreSQL
- **Frontend:** Next.js (App Router) + Axios
- **AI:** OpenAI (with a built‑in mock fallback for development)

## Project Structure
Project/
backend/ # NestJS application
frontend/ # Next.js application
README.md
DECISIONS.md
INCIDENT.md


## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (running instance)
- (Optional) Docker, if you prefer to run PostgreSQL in a container

## Quick Start (under 5 minutes)

### 1. Clone the repositorySet up the backend

```bash
git clone <your-repo-url>
cd lawyered-will-maker

#### Set up the backend
    bash
    cd backend
    npm install
    Create a .env file from the example:

    cp .env.example .env
    Edit the .env file to match your PostgreSQL instance and OpenAI API key (if you have one).
    Run the backend:

    npm run start:dev
    The backend should start and listen on port 3000.

### 2. Set up the frontend

```bash
    cd ../frontend
    npm install
    Run the frontend:

    npm run dev
    The frontend should start and listen on port 3001.
```

### 3. Access the application

Open your web browser and go to [http://localhost:3001](http://localhost:3001). You should see the AI-Assisted Will Maker application running.

## Running the application

### Backend

```bash
cd backend
npm run start:dev
```

### Frontend

```bash
cd ../frontend
npm run dev
```

## Development

### Backend

```bash

backend environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key (optional) but the other ai is not working properly

### Frontend

```bash

frontend environment variables:

- `API_URL`: Backend API URL (default: http://localhost:3000)
```

## Contributing