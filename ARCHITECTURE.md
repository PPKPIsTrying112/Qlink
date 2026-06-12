# Architecture

## Overview

QLink exists to help someone who's alone in a city find people to hang out with. That one goal set the constraint for everything else, because these are strangers meeting in real life. So the real question the system answers is: how do you let strangers connect without letting the wrong people in? That's why Gemini screens posts before they go live, why sign-in uses Google, and why notifications are real-time. They're the same idea in different places.

The frontend is a React single-page app. The backend is an Express server that does the real work: checking who you are, saving hangouts, handling join requests, and pushing notifications. Firestore holds the data and Firebase handles auth, so my time went into QLink instead of rebuilding those.

## Core Features

What a user can actually do in QLink:

- **Sign in** with email and password or with Google.
- **Set up a profile** with a name, age, bio, and photos they can reorder by dragging.
- **Post a hangout** with a title, a vibe (coffee, food, explore, chill), a location pinned from their device, a date and time, a max group size, and a description. Every post is screened by AI before it goes live.
- **Browse the feed** of hangouts near them and open any one for the full details.
- **Request to join** a hangout, which sends the host a notification in real time.
- **Approve or decline** requests as a host, which notifies the requester back in real time.
- **Close their own hangout**, which removes it from the feed.
- **See all activity** on an Alerts page that updates live as requests and responses come in.
- **Install QLink like an app** and keep using it offline: the layout still loads, and a join request made with no connection is queued and sent automatically once they're back online.

## Tech Stack

React + Vite + TypeScript on the frontend, Tailwind for styling, Express + Node + TypeScript on the backend, Firestore for data, Firebase Auth for identity (with Google SSO), Gemini 2.5 Flash for moderation, Server-Sent Events for notifications, and GKE + GitHub Actions for deployment. The sections below focus on why each of these is the way it is.

## Architecture Diagram

What talks to what while someone is using the app:

```
       Browser / PWA  (React SPA)
                |
                |  HTTPS
                v
           GKE Ingress
      (load balancer + TLS cert)
            /          \
          "/"          "/api"
           |             |
           v             v
     Client pods    Server pods
     nginx+React    Express+Node
                        |
                        +--> Firebase Auth  (verify JWT)
                        +--> Firestore      (data)
                        +--> Gemini 2.5     (moderation)

   SSE stream: server --> browser  (live notifications)
```

One HTTPS domain. The ingress sends `/` to the client pods (nginx serving the React build) and `/api` to the server pods. The server is the only thing that touches Firebase, Firestore, and Gemini; the browser never reaches them directly for protected data. Notifications come back down a separate SSE stream the server keeps open.

## Authentication

I built auth first, before anything else, because everything depends on it. You can't show someone their own hangouts, or notify the right person when a request is approved, without knowing who they are. Doing it first meant I never had to go back and rewire things later.

I used Firebase Auth because it gave me Google SSO and server-side token verification in one library, instead of building either myself. Every request carries the user's JWT in the `Authorization` header, and the auth middleware verifies it before the server touches any data; a missing or bad token gets a 401.

I chose Google SSO specifically because it makes fake accounts harder. Ten throwaway emails would be easy but ten convincing Google accounts are not and for an app that ends with two people meeting in person, that friction is the point.

 I kept the Firebase credentials and the verification logic in two separate files. Having Firebase Admin set up on the server only gives it the ability to check tokens; the middleware is what actually enforces it on every request. Splitting them means if I ever change how verification works, I touch one place.

## Request Flow

```
User taps "Create hangout"
  -> api.ts attaches the Firebase JWT to the Authorization header
  -> auth middleware verifies the JWT (401 if it fails)
  -> Gemini moderates the title and description
  -> if it's safe, the handler writes the hangout to Firestore
  -> the hangout shows up in the feed
```

Moderation runs before the write, not after, so a flagged post never reaches the database for even a second.

Every frontend request goes through `client/src/services/api.ts`, which attaches the token automatically, so no component handles auth on its own. The server has four route files: `/api/hangouts`, `/api/requests`, `/api/users`, and `/api/notifications`. Two checks in those handlers are deliberate: a join request is rejected if you've already requested that hangout (no spam), and a delete checks ownership so only the host can close their own hangout. Both are server-side, because a client check is a suggestion and a server check is a rule.

The hangout detail page is one component that changes by role: a guest sees "Request to join," the host sees "Close hangout," decided by comparing `user.uid` to `hostUid`. I did it as one role-aware page instead of two because it's the same data and layout, only the action differs.

## Notifications (SSE)

### Why SSE

QLink's whole loop depends on speed: a host posts, a guest asks to join, and the host needs to know now, not on their next refresh. I picked SSE over WebSockets because the traffic only goes one way. The server pushes events down ("someone requested to join," "your request was approved"), and the client never needs to send anything back up that channel, since user actions already go through the REST routes. A WebSocket's two-way channel would sit unused. I skipped polling because it either wastes requests on an empty inbox or adds a lag you can feel, and neither fits an app built on being live.

### The auth problem

The browser's `EventSource` API can't set headers, so the stream couldn't reuse the normal `Authorization`-header middleware. I passed the token as a query parameter and verified it with the same `verifyIdToken()` call as everything else: same security, different transport. The tradeoff is that tokens in a URL can end up in logs; fine at this scale, but a production version would use a short-lived single-use stream token.

### Connection handling

Each open connection sits in an in-memory map keyed by user ID, with an array per user so multiple tabs all get the same event. The connections are never closed server-side, because that open pipe is the mechanism, which brings the usual long-lived-connection problems: memory per client, silent disconnects, proxy timeouts. I handle them with a 30-second heartbeat and a disconnect handler that drops dead entries. One connection per user is clearly fine at QLink's scale.

Every notification is both pushed live and saved to Firestore, using one shared shape. The live push drives the instant badge, but it reaches no one if the recipient is offline, so saving to Firestore gives the Alerts page a durable history. On the client, a single Context provider owns the connection, so each user has exactly one stream no matter how many components show notifications.

### Two bugs on the live site

CORS on the stream route: the normal `cors()` middleware didn't cover the streaming response, because the SSE handler sets its own headers and sits outside the usual flow. I set `Access-Control-Allow-Origin` by hand on the stream. Until I did, `EventSource` kept rejecting and retrying in a tight loop, which quietly hammered the server, and it took me a while to realize the reconnect storm was my own doing.

The nginx assumption: I was sure nginx's proxy buffering would hold up SSE messages in production. When I finally checked, nginx only serves the static client, and the ingress routes `/api` straight to the server, so nginx was never in the SSE path at all. The real variable is the load balancer's idle timeout, which the heartbeat keeps from tripping. I'm including this one because I'd been about to fix a problem in a part of the system that wasn't even involved.

## PWA and Offline Support

I built QLink as a PWA because it's meant to be used on a phone, out in the city, maybe on bad signal. It installs to the home screen, and the service worker (from `vite-plugin-pwa`) precaches the app shell so the layout still loads with no connection.

The part I cared about most is offline writes. If you try to join a hangout while offline, the request is queued in `localStorage` instead of failing, and a `window` `online` listener replays the queue when you reconnect. Your join survives the dead zone and lands as soon as you're back.

This caused a bug that was my own fault: my first service-worker config cached `/api/`, which made the worker try to cache the SSE stream. A stream can't be cached, so it broke notifications entirely. I excluded `/api/` from the service worker, kept the app-shell caching, and dropped offline caching of API reads, which was the thing fighting the stream anyway.

## Deployment (GKE and CI/CD)

Every push to `main` triggers GitHub Actions, which runs the server tests, builds the client and server Docker images, pushes them to Google Container Registry, and applies the Kubernetes manifests. GKE runs two replicas per deployment, recreates any pod that dies, and the ingress routes HTTPS traffic to the healthy ones.

### Decisions I made inside that

**Two separate containers.** I split client and server into two images, because the client is just static files and the server is where the load lands. Keeping them apart means I can scale the server pods without touching the client, and ship a frontend change without rebuilding the backend.

**nginx for the client.** A React build is static files, so nginx fits, and its `try_files` rule fixes the SPA deep-link problem: going straight to `/profile` serves `index.html` and lets React Router take over instead of returning a 404.

**Multi-stage Docker builds.** The final client image is just nginx plus the built files, with Node and the dev dependencies left behind. Smaller images use less memory on the nodes, and memory turned out to be a real constraint.

**GKE Secrets.** The server holds the Firebase Admin key and the Gemini key. Images sit in a registry where they could be pulled, so I keep those in GKE Secrets, which are encrypted at rest and only handed to the pod at runtime.

**Built-in `fetch`, not the Gemini SDK.** Moderation is a single simple POST. The SDK earns its weight on streaming and retries, which I'm not doing, so `fetch` (built into Node 20) added no dependency and one less layer.

## Deployment Challenges

None of these went right the first time, and the reasoning behind each fix is the point.

**e2-small over e2-micro.** On e2-micro nodes the server pods kept dying. `ts-node` plus system overhead was more than 1 GB of RAM could hold, so Kubernetes killed the pods under memory pressure. I moved to an e2-small node pool and deleted the old one. This is the one deviation I had to take rather than choose, with instructor notification.

**Health check before Helmet.** The load balancer marks a backend UNHEALTHY (and the API starts throwing 502s) if `/health` doesn't return 200. A stale health check pointed at the wrong path had me confused for a while. I register `/health` before `app.use(helmet())` so the security middleware can't get in the way of the load balancer's check.

**Firebase key with `--from-file`.** The service-account key is a PEM that depends on real newlines. Creating the Kubernetes Secret with `--from-literal` mangled them, and Firebase Admin refused to start with a `DECODER routines::unsupported` error that said nothing useful. `--from-file` preserved the formatting and fixed it.

**Doubled `/api` path.** After deploy, calls were hitting `/api/api/hangouts` and 404ing. My `VITE_API_URL` already ended in `/api` and the axios paths added `/api` again. I set the build value to the base URL only.

**Vite env vars are build-time.** Vite compiles a static bundle, so there's no runtime `process.env` for the frontend to read; anything it needs has to be present during `npm run build`. I pass the `VITE_*` values as Docker build args and write them to a `.env` file before the build.

**HTTPS.** A Google-managed TLS certificate on the GKE ingress, with the course domain `team16.cs144.org` pointed at the load balancer. Once it was active I switched `CLIENT_URL` and `VITE_API_URL` to the HTTPS domain so the whole app runs on one secure origin. I picked the managed cert over cert-manager / Let's Encrypt because it's native to the ingress with fewer moving parts.

## Folder Structure

```
team16/
  client/                      React + Vite frontend
    src/
      components/
        auth/                  Login, register
        hangouts/              Feed, card, detail, create
        profile/               Profile page
        notifications/         Alerts panel, badge
        ui/                    Shared components (nav, etc.)
      context/                 AuthContext, NotificationsContext
      services/                api.ts, offlineQueue.ts
      firebase.ts              Firebase client init
  server/                      Express + Node backend
    src/
      routes/                  hangouts, requests, users, notifications
      middleware/              auth verification
      services/                Firebase Admin, Gemini, SSE manager
      lib/                     pure helpers + unit tests
  k8s/                         Kubernetes manifests
  .github/workflows/           GitHub Actions CI/CD
```

Components are grouped by feature, the server has one file per resource, and everything that talks to the outside world (Firebase, Gemini, SSE) is isolated in `services/` so the route handlers stay about QLink's logic.

## Known Limitations and Future Work

Hosts can close a hangout but can't edit one yet.

Past-dated hangouts don't auto-archive. The `status` field already supports it, so only the transition logic is missing.

The feed isn't sorted server-side. Combining Firestore's `where()` and `orderBy()` needs a composite index, so for now I query without `orderBy()` and would add it back with the index configured.

Contact exchange on approval is what I'd build next. Right now an approval just notifies the guest, but the real idea is that once a host approves you, you'd see their socials and could actually coordinate, since QLink has no built-in chat by design. I scoped it out on purpose, but it's the most meaningful thing missing, because "approved" is exactly when two strangers finally need a way to reach each other.