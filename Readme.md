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


#### Set up the backend
    cd backend
    npm install
    Create a config.env file from the .env.example .
    Edit the .env file to match your PostgreSQL instance and OpenAI API key (if you have one).
    run the below command to create the database and tables:
    psql -U postgres -d willmaker -f database/seed.sql
    
    Run the backend:
    npm run start:dev
    The backend should start and listen on port 3000.

### 2. Set up the frontend

```bash
    cd ../frontend
    npm install
    Run the frontend:

    npm run dev
    The frontend should start and listen on port 5000.
```

### 3. Access the application

Open your web browser and go to [http://localhost:3000](http://localhost:3000). You should see the AI-Assisted Will Maker application running.



## Contributing