# Requirements

## Look and Feel

**Semantic HTML5**
Semantic HTML5 elements are used throughout — `<nav>`, `<main>`, `<article>`, `<section>`, `<header>` — avoiding generic `<div>` tags where a semantic alternative exists.

**HTML5 APIs (2 required)**
- **Geolocation API** — implemented in the CreateHangout component. When a user taps the Pin button, the browser requests their location and attaches the coordinates to the hangout post, so each hangout stores real `lat`/`lng` data in Firestore for distance filtering.
- **Drag and Drop API** -  used in ProfilePage — drag an image file onto the drop zone to add a profile photo, and drag photos to reorder them. Photos preview in-session; persisting them to cloud storage (Firebase Storage) is noted as future work.

**Responsive Design**
The app is responsive at 320px (mobile), 768px (tablet), and 1024px (desktop) using Tailwind breakpoint utilities, verified at each width with no overflow or broken layout. Mobile uses a bottom navigation bar; desktop uses a left sidebar.

**CSS Framework**
Tailwind CSS (v4, via the `@tailwindcss/vite` plugin) is used consistently throughout the entire application. No other CSS approach is mixed in.

**Single Page Application**
Built with React and React Router; navigation is fully client-side and never triggers a full page reload. For example, after creating a hangout the app navigates to the feed without reloading, and the new hangout appears immediately in the list.

**Frontend Framework**
React with Vite and TypeScript.

**Backend Framework**
Node.js with Express and TypeScript, providing a clean separation between the frontend and the API.

**Accessibility**
- Semantic HTML provides screen-reader structure throughout.
- ARIA attributes are applied where applicable — `aria-label` on icon-only buttons and navigation, `aria-current` on the active nav item, `role="alert"` on error messages, and `aria-live`/`aria-busy` on loading states.
- Color contrast meets WCAG AA (verified — muted text adjusted to clear the 4.5:1 ratio).
- Full keyboard tab navigation with a visible focus indicator on all interactive elements.
- Verified with a Lighthouse Accessibility score of 95.

---

## Progressive Web App (PWA)

**Installable**
The app ships a generated web manifest (via `vite-plugin-pwa`) with name, icons, theme colors, and `display: standalone`, making it installable on desktop and mobile.

**Offline Support**
A service worker precaches the app shell, so the layout and navigation remain available with no network connection rather than showing a browser error; the feed displays a loading indicator while it attempts to fetch data. Crucially, **join requests made while offline are queued in localStorage and automatically replayed to the server when connectivity returns** (a `window` `online` listener flushes the queue), satisfying the "queued database inserts" requirement.

**Server-Initiated Notifications**
Server-Sent Events (SSE) are used via an Express endpoint at `/api/notifications/stream`. The server pushes real-time notifications to connected clients when someone requests to join a hangout and when a host approves or declines a request. This is visibly triggered from the backend and demonstrated in the recorded demo.

**HTTPS**
Served over HTTPS using a Google-managed TLS certificate attached to the GKE ingress, on a course-provided domain (`team16.cs144.org`) pointed at the load balancer.

---

## Authentication and Security

**Authentication Method**

QLink is built around meeting strangers in real cities, so being sure who is actually behind each hangout post and join request mattered from the start.

Firebase Auth was chosen because it provides both Google SSO and JWT token verification in one library, with none of it built from scratch. When someone logs in, Firebase issues a token. Every request that user makes — creating a hangout, sending a request, checking notifications — carries that token to the server, which verifies it before doing anything else.

Google SSO was chosen specifically because it raises the bar for fake accounts. Creating ten fake Gmail accounts is meaningfully harder than creating ten fake email addresses, and for an app where people physically meet up, that extra credibility matters.

Auth was built before any other feature because everything depends on it: you cannot show someone their own hangouts, or notify the right person when a request is approved, without knowing who they are. Getting it right first meant nothing had to be rewired later.

On the server, Firebase setup and auth checking are kept deliberately separate: one file holds the Firebase Admin credentials, and a separate middleware file uses them to verify every incoming request. An invalid or missing token gets a 401 before any data is touched. This separation means that changing how tokens are verified only touches one file.

**Password Hashing**
Firebase Auth handles password hashing internally using industry-standard methods, which satisfies the hashing requirement by proxy; it is delegated rather than hand-rolled.

**Route Protection**
Every authenticated page is wrapped in a `ProtectedRoute` component. Unauthenticated users attempting to reach the feed, a hangout detail, or their profile are redirected to login.

**XSS Mitigation**
Helmet.js runs on the Express server and sets security headers (including a content security policy and other XSS protections) automatically on every response.

**CSRF Mitigation**
Authentication uses a JWT sent in the `Authorization` header (not a cookie), so there is no ambient session cookie for a cross-site request to exploit. On top of that, CORS is locked to QLink's frontend domain via the `CLIENT_URL` environment variable, so requests from any other origin are rejected. The domain lives in an environment variable so it switches automatically between localhost in development and the live HTTPS domain in production.

**Injection Mitigation**
All database access goes through the Firestore SDK; raw queries are never written. The SDK parameterizes operations, so there is no path for injection through the data layer.

**Secrets Management**
No API keys, Firebase credentials, or Gemini keys are hardcoded in the repository. Locally they live in gitignored `.env` files; in production they live in GKE Secrets. Cloning the repo yields no credentials.

---

## Backend and Persistent Data

**Database**
Firestore (GCP-native). Chosen for its direct integration with Firebase Auth, its free tier, its lack of SQL schema management, and because QLink's entities (users, hangouts, requests) are mostly self-contained documents that don't require relational joins. (For heavily relational data a SQL database would have been the better fit, but QLink's data is not.)

**ORM/ODM**
The Firestore SDK is used for all database interactions, satisfying the ODM requirement.

**Routes**
There are four route files — hangouts, requests, users, and notifications. Every route is protected by the auth middleware, so no data can be read or written without a verified user. Duplicate join requests are checked server-side so a user cannot spam the same hangout, and ownership is checked before a delete so only the host who created a hangout can close it.

**Known limitation:** combining Firestore's `where()` and `orderBy()` on the same query requires a composite index. To avoid blocking the feed while the index built, the feed currently queries without `orderBy()`; adding it back with the proper index configured is noted as future work.

---

## AI Integration

**Provider**
Gemini 2.5 Flash via the Google AI Studio free tier.

**Usage — content moderation**
When a user creates a hangout, the title and description are sent to Gemini, which is prompted to return `SAFE` or `UNSAFE: <reason>`. If the content is flagged (harassment, hate speech, sexual content, solicitation, scams, or anything unsafe for a public meetup), the post is rejected with the reason shown to the user, before it is ever saved to Firestore. The moderation call fails open — if Gemini is unavailable, the post is allowed — so the app never breaks if the free tier rate-limits.

---

## Systems and Deployment

**GKE**
Deployed on Google Kubernetes Engine with 2 nodes and 2 pod replicas per Deployment (client and server). Self-healing is demonstrated in the recorded demo by killing a pod and showing Kubernetes recreate it; manual scaling is demonstrated by changing the replica count.

**CI/CD**
GitHub Actions triggers on every push to `main` and runs three stages — **build, test, and deploy**. The pipeline runs server unit tests, builds the client and server Docker images, pushes them to Google Container Registry, and applies the Kubernetes manifests. No manual `kubectl apply` is used.

---

## Deviations

- **e2-small nodes instead of e2-micro.** The e2-micro nodes (1 GB RAM) could not handle the TypeScript server runtime under memory pressure, so the workload was upgraded to e2-small. The spec permits this with instructor notification, which was provided.
- **Google-managed TLS certificate instead of cert-manager / Let's Encrypt.** Both achieve HTTPS; the managed certificate is native to the GKE ingress with fewer moving parts. The instructor indicated either approach is acceptable.

---

## AI Usage in Development

Model: Claude Sonnet 4.6

I didn't use an AI code editor, I used a pure agent, because I wanted a back-and-forth. I know which concepts I'm weaker on, so I treated the AI as a pair-programming partner I could lean on to break down the topics I was having a hard time grasping. It helped me get started on tasks I was less sure about and was efficient at debugging. But I tried to fully understand the scope and keep my prompting minimal, so that what it was doing for me stayed within my own sight. Every AI-assisted piece of code was reviewed and tested by me. Specifically, AI helped with:

- Initial folder-structure scaffolding and boilerplate component shells
- Tailwind class suggestions for responsive layouts
- Kubernetes YAML and the GitHub Actions workflow
- Debugging deployment issues (e.g. a Firebase private-key newline bug in a Kubernetes Secret, a stale GCP ingress health check, and a service worker that initially intercepted the SSE stream)
- Explaining concepts (SSE, PWA service workers, Firestore relationships) so decisions were made with understanding

---

## User Experience Notes

**Accessibility as a deliberate choice.** Accessibility was treated as part of the product rather than a box to tick. The color palette was adjusted so muted text clears the WCAG AA contrast ratio, which keeps it readable both for low-vision users and in bright outdoor light — something that matters for an app people use while they're out in the city. Every interactive element is reachable by keyboard with a visible focus outline, so the app works without a mouse or touch. Icon-only buttons carry `aria-label`s, and loading and error states announce themselves to screen readers, so someone using assistive tech gets the same information as everyone else.

**Responsiveness rationale.** QLink uses a bottom navigation bar on mobile because users are out in the city, often holding their phone one-handed — bottom nav keeps every page reachable with one thumb. On desktop, a left sidebar gives more room and matches how people scan a screen left to right.

**Error and empty states.** The feed shows an empty state ("Be the first to create one") rather than a blank screen when no hangouts exist, turning an empty result into an invitation. Failed actions (e.g. a rejected hangout) surface the specific reason returned by the server rather than a generic error.