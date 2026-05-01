# Team Task Manager

A complete MERN-style full-stack web app for creating projects, managing team members, assigning tasks, and tracking project progress with Admin and Member roles.

## Features

- Signup and login with JWT authentication
- Admin and Member role-based access control
- Public signup always creates Member accounts; Admin accounts can only be created by an existing Admin
- Project CRUD for admins
- Team assignment per project
- Task creation, assignment, status tracking, priority, due dates, and overdue dashboard cards
- REST API with validation and relational data models
- MongoDB support through `MONGO_URI`
- Local development fallback storage so the app works without installing MongoDB locally

## Tech Stack

- React + Vite
- Express + Node.js
- MongoDB + Mongoose when `MONGO_URI` is set
- JWT + bcrypt authentication

## Run Locally

```bash
npm install
npm run dev
```

Open:

- Frontend: http://localhost:5173
- API: http://localhost:5000

For a real MongoDB database, create `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change-this-secret
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/team-task-manager
```

If `MONGO_URI` is not provided, the API uses a local JSON database at `server/data/local-db.json` for easy demo/testing.

## Demo Accounts

When local fallback storage is empty, demo users are created automatically:

- Admin: `admin@example.com` / `Admin@123`
- Member: `member@example.com` / `Member@123`

When MongoDB is empty, only the initial admin is seeded automatically:

- Admin: `admin@example.com` / `Admin@123`

Public signup creates Member accounts only. Additional Admin accounts must be created from inside the app by an existing Admin.

## Railway Deployment

1. Push this repo to GitHub.
2. Create a MongoDB Atlas database and copy the connection string.
3. Create a Railway project from the GitHub repo.
4. Add environment variables:
   - `MONGO_URI=mongodb+srv://...`
   - `JWT_SECRET=use-a-long-random-secret`
   - `NODE_ENV=production`
   - `CLIENT_URL=https://your-railway-app-url.up.railway.app`
5. Railway can read `railway.json` for build/start commands:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

The Express server serves the built React app in production.

In production, the React app calls the API through same-origin `/api`, so you do not need `VITE_API_URL` unless you deploy frontend and backend separately.
