# launchpad-web

A small Launch Checklist demo using Next.js App Router, TypeScript, and Tailwind CSS. No authentication, database, or UI library. Tasks are stored by the API.

## Run locally

Use Node.js 20 (20.9 or later) and npm:

```sh
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## API URL

`.env.example` points to the demo backend:

```env
NEXT_PUBLIC_API_URL=https://demo-fastapi-with-zynnode.zynnode.cc
```

Change this in `.env.local` to use another backend. Without a value, the app uses `http://localhost:8000`. Trailing slashes are removed automatically. The footer shows the URL in use.

`NEXT_PUBLIC_API_URL` is public and embedded in the browser bundle at build time. Set it **before** running `npm run build`; rebuild after changing it. For local development, restart the dev server after changes. Never put secrets in this variable.

All requests run in the browser. The backend must allow the frontend’s origin through CORS, including POST, PATCH, DELETE, and the Content-Type header. Use an HTTPS API when serving the frontend over HTTPS.

Expected API:

| Method | Endpoint | Response / request |
| --- | --- | --- |
| GET | `/health` | `{ "environment": "local", "status": "ok" }` |
| GET | `/api/tasks` | Array of `{ "id": 1, "title": "Ship it", "done": false }` |
| POST | `/api/tasks` | JSON body `{ "title": "Ship it" }`; title 1–80 characters |
| PATCH | `/api/tasks/{id}/toggle` | Updated task |
| DELETE | `/api/tasks/{id}` | 204 No Content |
| GET | `/api/stats` | `{ "total": 4, "done": 2, "remaining": 2 }` |

The app refreshes tasks and API stats after each change. Requests time out after 10 seconds and failures show an inline message with a refresh action.

## Production check

```sh
npm run typecheck
npm run build
npm start
```

The build needs no API connection or external fonts. Commit `package-lock.json` and use `npm ci` for reproducible installs. No deployment configuration is required by this project.
