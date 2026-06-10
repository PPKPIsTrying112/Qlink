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

All frontend requests go through client/src/services/api.ts which automatically attaches the user's Firebase JWT token so no component has to handle auth manually.


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

Why GKE + load balancer
QLink is a real-time app — people post hangouts and others request to join while the host is online — so I couldn't let the whole thing depend on a single server. If that one server crashed mid-demo, the app would just be down. I deployed to GKE with 2 pod replicas per service behind a load balancer (136.110.169.18) so the app stays up even if a pod dies. Kubernetes detects the dead pod and recreates it automatically (self-healing), and I can add pods if traffic spikes (scaling) — both of which are demo requirements.
Why e2-small over e2-micro
I originally ran the cluster on e2-micro nodes (1GB RAM) to stay cheap, but the server pods kept dying. The TypeScript server runs through ts-node, and that runtime plus system overhead exceeded what 1GB could handle, so pods were getting killed under memory pressure. I migrated the workload to a new e2-small node pool and deleted the old one, which resolved it. 
Why I bake env vars at build time (Vite)
The frontend's Firebase config is injected when the Docker image is built, not at runtime — which is different from how the server handles secrets. This is because Vite compiles a static bundle: once it's built, there's no Node process to read process.env, so anything the frontend needs has to be baked in during npm run build. I pass the VITE_* values as Docker build args and write them to a .env file before building, so the live Firebase keys end up compiled into the final bundle.
Why the health check route runs before Helmet
The load balancer only sends traffic to pods it considers healthy, and it decides that by pinging a /health route on each pod. If that route doesn't return 200, GCP marks the entire backend UNHEALTHY and the API returns 502s — even when the server is actually running fine. I learned this the hard way when a stale health check pointed at the wrong path. I register /health before app.use(helmet()) so the security middleware can't interfere with or block the load balancer's check.
Why the Firebase private key uses a Secret with --from-file
The server authenticates to Firebase with a service-account private key, which I store in a Kubernetes Secret to keep it out of the image and the repo. The key is a PEM that depends on real newline characters, and when I first created the Secret with --from-literal, the newlines got mangled and Firebase Admin failed to initialize (DECODER routines::unsupported). I switched to --from-file, which preserves the formatting exactly, and the app reads the key from an env var at runtime.


# Docker
We use two separate Docker containers — one for the React client, one for the Express server. This separation means we can scale them independently on GKE. If QLink gets a lot of traffic hitting the API, we can add more server pods without touching the client. If we need to update the frontend without changing the backend, we deploy only the client image. Each container is self-contained with everything it needs to run — no dependency on the host machine

Both Dockerfiles follow layer caching best practices — package.json is copied and dependencies installed before the source code is copied.

## Why GKE

QLink needs to stay online even if something goes wrong. 
Running 2 pod replicas means if one pod crashes, the other 
keeps serving users without any downtime. Kubernetes detects 
the failure and spins up a replacement automatically. For an 
app where people are actively coordinating meetups in real 
time, that reliability matters.

## Real-Time Notifications (SSE)
Real-Time Notifications (SSE)
QLink's core loop depends on immediacy: a host posts a hangout, a guest requests to join, and the host needs to know now — not on their next refresh. The moment a request sits unseen, the app fails at the one thing it's for. So real-time delivery wasn't a nice-to-have; it shaped the notification architecture.
I chose Server-Sent Events over WebSockets because QLink's notification traffic is strictly one-directional. The server pushes events to the client — "someone requested to join," "your request was approved" — and the client never needs to push anything back down that same channel; user actions already go through the normal REST endpoints. A WebSocket's bidirectional channel would be capability the app never exercises, so SSE matches the actual data flow while staying lighter to run and reason about. Polling was rejected for the opposite reason: it would either waste requests on an empty inbox or introduce a visible lag, neither of which fits an app whose value is real-time presence.
The main architectural friction was authentication. Every other QLink route authenticates via a Firebase JWT in the Authorization header, but the browser's EventSource API can't set headers, so the stream endpoint can't reuse that middleware directly. I resolved this by passing the token as a query parameter and verifying it with the same verifyIdToken() call the rest of the API uses — identical security guarantee, different transport. I'm aware of the tradeoff that tokens in URLs can surface in logs; at QLink's scale and threat model that's acceptable, but a production version would issue a short-lived single-use stream token instead.
The server holds each live connection in an in-memory map keyed by user ID, with an array per user so multiple open tabs all receive the same event. Connections are deliberately never closed server-side — that open pipe is the mechanism — which introduces the usual liabilities of long-lived connections: memory per client, silent disconnects, and proxy timeouts. I mitigated these with a 30-second heartbeat to keep connections warm and a disconnect handler that evicts dead entries from the map so they don't leak. This is a conscious scale tradeoff: holding a connection per user is clearly fine for QLink, and the point at which it wouldn't be is well beyond this project.
Finally, every notification is both persisted to Firestore and pushed live, using a single shared object shape. The live push drives the real-time badge, but a push reaches no one if the recipient is offline at that instant; persisting to Firestore gives the Alerts view a durable history so nothing is lost between sessions. Reusing one schema for both the stored record and the streamed payload means the client renders live and historical notifications through the same path.
(Implementation note for the demo: nginx buffers proxied responses by default, which holds SSE messages rather than streaming them; buffering is disabled on the stream route so events arrive instantly on the deployed site.)

The SSE connection is owned by a single Context provider rather than instantiated per-component, so each user holds exactly one open stream regardless of how many components display notifications — avoiding duplicate connections and the extra server-side memory and write cost they'd incur.