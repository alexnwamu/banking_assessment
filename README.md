# Banking Dashboard

Full-stack banking dashboard with:

- React + TypeScript (Vite)
- Node.js + Express (TypeScript)
- SQLite (file-based, created locally on first run)
- JWT authentication + rate limiting

## Demo credentials

- Email: `admin@demo.com`
- Password: `Admin123`

## Run locally (Node)

### Prerequisites

- Node.js 18+
- npm

### 1) Clone

```bash
git clone https://github.com/alexnwamu/banking_assessment.git
cd banking_assessment
```

### 2) Install deps

```bash
npm run install-all
```

### 3) Start both client + server

```bash
npm run dev
```

App URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

SQLite DB file:

- `server/data/banking.db`

## Run with Docker

### Prerequisites

- Docker + Docker Compose

### Start

```bash
docker compose up --build
```

App URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

The SQLite DB is stored in a Docker volume named `server_data`.

### Stop

```bash
docker compose down
```

### Reset the DB (Docker)

```bash
docker compose down -v
```

## Notes

- The backend creates the SQLite database + demo user automatically on first startup.
- The client currently calls the API at `http://localhost:3001/api`.
