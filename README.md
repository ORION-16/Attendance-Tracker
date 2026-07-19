# Roll Call — Attendance Tracker

A private, single-student attendance tracker built with React, Express, and MongoDB.

## Start it locally

Open two terminals from this folder:

```bash
cd backend && npm start
```

```bash
cd frontend && npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). The API runs on `http://localhost:5001` because port 5000 is occupied by macOS on this machine.

## Required configuration

`backend/.env` must have values for:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=your-mongodb-uri
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=a-long-random-secret
REFRESH_TOKEN_SECRET=a-different-long-random-secret
```

Never commit `.env`; it contains credentials.

## Deploy on Render

This repository includes [render.yaml](render.yaml), which deploys the API and frontend as two services.

1. Create a new empty GitHub repository, then push this project to it.
2. In Render, choose **New → Blueprint** and select that GitHub repository.
3. Enter these values when Render asks for them:

   | Render service | Variable | Value |
   | --- | --- | --- |
   | `roll-call-api` | `MONGODB_URI` | Your MongoDB Atlas connection URI |
   | `roll-call-api` | `CLIENT_URL` | The final `https://roll-call-web.onrender.com` URL Render assigns |
   | `roll-call-web` | `VITE_API_URL` | The final `https://roll-call-api.onrender.com/api` URL Render assigns |

4. Redeploy the API after setting `CLIENT_URL`, then redeploy the static site after setting `VITE_API_URL` (Vite reads it during the build).
5. In MongoDB Atlas Network Access, allow Render to reach the database. For an initial deployment, `0.0.0.0/0` is commonly used; keep the database user password strong and scoped to this app.

Render generates the two JWT secrets automatically. Keep every secret in Render’s environment-variable settings—never in the GitHub repository.

## Push to GitHub

After creating an empty repository on GitHub, run these commands from this project folder, replacing the URL with yours:

```bash
git add .
git commit -m "Initial attendance tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## What is included

- Secure registration, login, refresh-token rotation, and logout
- Student-owned years/semesters and subjects
- Present/absent marking for today, with safe upsert behavior
- Per-subject and overall attendance calculation performed in MongoDB
- Clean, responsive dashboard with readable typography and an earthy green/amber palette
