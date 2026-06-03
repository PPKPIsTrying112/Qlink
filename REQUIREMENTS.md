# Requirements

## Look and Feel

**Semantic HTML5**
We use semantic HTML5 elements throughout — `<nav>`, `<main>`, 
`<article>`, `<section>`, `<header>` — avoiding unnecessary 
`<div>` tags where a semantic alternative exists.

**HTML5 APIs (2 required)**
- Geolocation API: Used in CreateHangout component to pin the 
user's current location when creating a hangout post.
- Drag and Drop API: Used in ProfilePage to allow users to 
reorder their profile photos.

**Responsive Design**
The app is fully responsive at 320px (mobile), 768px (tablet), 
and 1024px (desktop) using Tailwind CSS breakpoint utilities. 
Mobile uses a bottom navigation bar, desktop uses a left sidebar.

**CSS Framework**
Tailwind CSS is used consistently throughout the entire 
application. No other CSS approaches are mixed in.

**Single Page Application**
Built with React and React Router. Navigation never triggers 
full page reloads. All routing is client-side.

**Frontend Framework**
React with Vite and TypeScript.

**Backend Framework**
Node.js with Express and TypeScript. Chosen because it was 
taught in lecture and provides a clean separation between 
frontend and backend.

**Accessibility**
- ARIA labels applied to all interactive elements
- Color contrast meets WCAG AA standards
- Tab navigation supported across all pages
- LoadingSpinner announces "Loading" to screen readers via 
aria-live region
- Semantic HTML provides screen reader context throughout

---

## Progressive Web App (PWA)

**Installable**
The app includes a manifest.json with name, icons, and 
display: standalone. Installable on both desktop and mobile.

**Offline Support**
A service worker caches static assets and provides an offline 
fallback page. When offline, the app shows the layout with a 
"Reconnecting..." indicator informing the user data is loading.

**Server-Initiated Notifications**
We use Server-Sent Events (SSE) via an Express endpoint at 
/api/notifications/stream. The server pushes join requests, 
approvals, and nearby hangout alerts to connected clients in 
real time. Demonstrated in the recorded demo.

**HTTPS**
Enforced via GKE ingress with TLS termination.

---

## Authentication and Security

**Authentication Method**
We use Firebase Authentication with email/password and Google 
SSO. Firebase Auth satisfies the password hashing requirement 
by proxy — Firebase handles bcrypt internally.

We use React Context to manage authentication state globally, 
giving every component access to the current user without prop 
drilling. Firebase's onAuthStateChanged listener reactively 
updates the app when a user logs in or out.

**Password Hashing**
Delegated to Firebase Authentication as permitted by the spec.

**Route Protection**
Unauthenticated users are redirected to the login page via a 
ProtectedRoute component that checks auth state before 
rendering any protected page.

**XSS Mitigation**
Helmet.js sets Content Security Policy headers on every 
Express response.

**CSRF Mitigation**
CORS is locked to the frontend domain only via the CLIENT_URL 
environment variable. SameSite cookie policy is enforced.

**Injection Mitigation**
All database interactions go through the Firestore SDK which 
uses parameterized queries by design — no raw queries are 
written anywhere.

**Secrets Management**
No API keys or secrets are hardcoded anywhere in the codebase. 
All secrets are stored in .env files locally and GKE Secrets 
in production.

---

## Backend and Persistent Data

**Database**
Firestore (GCP native). Chosen because it integrates naturally 
with Firebase Auth, has a free tier, requires no SQL schema 
management, and fits the document-based data model of user 
profiles and hangout posts.

**ORM/ODM**
Firestore SDK used for all database interactions, satisfying 
the ODM requirement.

---

## AI Integration

**Provider**
Gemini 2.5 Flash via Google AI Studio free tier.

**Usage**
- Content moderation: When a user creates a hangout post, 
the content is sent to Gemini for moderation before going 
live. Inappropriate content is flagged and rejected.
- Icebreaker generation: Once a user is approved to join a 
hangout, Gemini generates a contextual icebreaker question 
based on the hangout vibe and description.

---

## Systems and Deployment

**GKE**
Deployed on Google Kubernetes Engine with 2 e2-micro nodes 
and 2 pod replicas per Deployment (client and server). 
Self-healing demonstrated in the recorded demo by killing a 
pod and showing Kubernetes recreate it automatically. Manual 
scaling demonstrated by modifying the replica spec.

**CI/CD**
GitHub Actions triggers on every push to main. The pipeline 
builds Docker images, pushes to Google Container Registry, 
and applies Kubernetes manifests via kubectl. No manual 
kubectl apply is ever used.

---

## AI Usage in Development

The following parts of this project were assisted by AI:
- Initial folder structure scaffolding
- Boilerplate component shells
- Tailwind class generation for responsive layouts
- Kubernetes YAML configuration
- GitHub Actions workflow

All AI-generated code was reviewed, understood, and modified 
by the developer. The developer is responsible for all bugs 
and architectural decisions.