# Architecture

## System Overview

QLink exists for one reason — to help people who are alone in a 
city find others to hang out with. To make that work safely and 
reliably, we built a full-stack web application where every piece 
has a specific job.

The frontend is a React single page application. It never reloads 
— users move between the feed, their profile, and hangout details 
without any interruption. The backend is an Express server that 
handles all the logic — verifying who you are, saving hangouts, 
processing join requests, and pushing real time notifications. 
Firebase handles authentication and data storage because we wanted 
to focus on the QLink experience, not infrastructure plumbing.

## Tech Stack

| Layer | Choice | Why we chose it for QLink |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast, component-based, taught in lecture |
| Styling | Tailwind CSS | Lets us build a consistent dark warm UI quickly |
| Backend | Express + Node + TypeScript | Clean REST API, taught in lecture |
| Database | Firestore | GCP native, no SQL overhead, perfect for social data |
| Auth | Firebase Auth | Handles password security, supports Google SSO |
| AI | Gemini 2.5 Flash | Free tier, GCP native, meaningful moderation use |
| Notifications | Server-Sent Events | One direction push from server, simpler than WebSockets |
| Deployment | GKE + GitHub Actions | Required, gives us real scalability and fault tolerance |

## Auth Flow

QLink connects strangers. That means knowing exactly who is 
behind every hangout post, every join request, and every 
approval matters deeply. We did not want to guess.

When a user logs into QLink, Firebase Auth issues them a JWT 
token — a cryptographically signed proof of identity. Every 
single request that user makes to our server carries that token 
in the Authorization header. Before our server does anything — 
before it reads a hangout, saves a request, or sends a 
notification — it verifies that token using Firebase Admin SDK.

If the token is missing or invalid, the server returns 401 
immediately. No data is read, no action is taken. This means 
a stranger cannot post a hangout pretending to be someone else, 
and a logged out user cannot see the QLink feed.

We chose Firebase Auth specifically because it handles password 
hashing internally, supports Google SSO out of the box, and its 
Admin SDK makes server-side token verification straightforward 
and reliable.

Having Firebase Admin SDK initialized on the server does not 
automatically make the server secure. It simply gives the server 
the credentials to verify users. The auth middleware is what 
actually enforces security on every incoming request — it is the 
layer between having Firebase credentials and actually trusting 
who is on the other end of a request.

## Request Flow

A user taps "Create hangout" on QLink
→ React calls api.ts which attaches the user's Firebase JWT 
  to the Authorization header
→ Request reaches the Express server
→ auth middleware verifies the JWT using Firebase Admin SDK
→ If valid, the route handler runs and saves the hangout to Firestore
→ Gemini moderates the content before it goes live
→ Response returns to the React frontend
→ The new hangout appears in nearby users feeds

The server has three resource routes — /api/hangouts, /api/requests, and /api/users. Hangout routes handle creating and discovering hangouts. Request routes handle joining and approving. User routes handle profiles. All three follow the same pattern — auth middleware runs first, then the route handler talks to Firestore.

## API Endpoints
Hangout Routes /api/hangouts

GET /api/hangouts — fetches all active hangouts near you, ordered by most recent. This is what powers QLink's feed
GET /api/hangouts/:id — fetches one specific hangout's full details for the detail page
POST /api/hangouts — creates a new hangout, automatically sets the host as the logged in user
DELETE /api/hangouts/:id — cancels a hangout, but only if you are the host who created it


Request Routes /api/requests

POST /api/requests — sends a join request to a hangout. Checks first if you already requested so you cannot spam the same hangout
PUT /api/requests/:id — updates a request status to approved or declined. Used by the host to respond to join requests


User Routes /api/users

GET /api/users/:uid — fetches any QLink user's profile by their uid
PUT /api/users/:uid — updates your own profile. Blocked if you try to edit someone else's profile
POST /api/users/me — creates your user document in Firestore the first time you register. Only runs if the document doesn't exist yet


## Notification Flow

QLink notifications happen in real time using Server-Sent Events.
We chose SSE over WebSockets because notifications in QLink only 
go one direction — from server to user. SSE is simpler, lighter, 
and fits that use case perfectly.

User A requests to join User B's hangout
→ Server saves the request to Firestore
→ sse.ts pushes a join request event to User B's open SSE connection
→ User B sees the notification badge update instantly
→ User B approves the request
→ Server pushes an approved event to User A
→ User A knows they are in without refreshing the page

## PWA and Offline

QLink is designed to be used on the go — on a phone, in a city, 
possibly with patchy internet. That is why we built it as a 
Progressive Web App. Users can install QLink on their home screen 
like a native app. If they lose connection, the app does not 
crash — it shows the layout with a reconnecting indicator and 
picks back up when the connection returns.

## Folder Structure

team16/
  client/                 React + Vite frontend
    src/
      components/         UI components organized by feature
        auth/             Login and register pages
        hangouts/         Feed, cards, detail, create hangout
        profile/          Profile page and edit profile
        notifications/    Notification panel and badge
        ui/               Shared components used everywhere
      context/            AuthContext and NotificationContext
      hooks/              useAuth, useGeolocation, useNotifications
      services/           All API calls to the Express backend
    public/
      manifest.json       PWA installability
      sw.js               Service worker for offline support
  server/                 Express + Node backend
    src/
      routes/             One file per resource
      middleware/         Auth verification and security headers
      services/           Firebase Admin, Gemini AI, SSE manager
  k8s/                    Kubernetes deployment manifests
  .github/workflows/      GitHub Actions CI/CD pipeline

## Deployment Pipeline

We do not deploy manually. Every push to the main branch 
triggers GitHub Actions automatically. This ensures QLink 
is always running the latest code without human error in 
the deployment process.

Push to GitHub main branch
→ GitHub Actions builds the client Docker image
→ GitHub Actions builds the server Docker image
→ Both images pushed to Google Container Registry
→ kubectl applies the k8s manifests to our GKE cluster
→ GKE runs 2 e2-micro nodes with 2 pod replicas per deployment
→ If a pod crashes, Kubernetes recreates it automatically
→ Ingress routes HTTPS traffic to the correct running pods

## Why GKE

QLink needs to stay online even if something goes wrong. 
Running 2 pod replicas means if one pod crashes, the other 
keeps serving users without any downtime. Kubernetes detects 
the failure and spins up a replacement automatically. For an 
app where people are actively coordinating meetups in real 
time, that reliability matters.