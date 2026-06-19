# R.A.V.I.D. React Frontend

Small Vite + React + Tailwind + shadcn test console for the Django backend.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

The default API URL is:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the backend first from `../django-backend`:

```bash
docker compose up --build
```

Then open the Vite URL and use the console to register/login, upload PDF/TXT/MD files, poll ingestion status, and test both normal JSON chat and SSE streaming chat.
